-- Eletromark Refrigerações (Belo Horizonte) — mesmo sistema da Rodrigues
-- (gestor + técnicos, fila com cadeado, comissão, estoque por técnico,
-- OS no modelo, assinatura, retorno, estorno...). SEM conta Loja.
--
-- slug: eletromark-refrigeracoes
--
-- PARTE 1 — roda agora: cria a empresa com as funções da Rodrigues ligadas.
-- PARTE 2 — roda DEPOIS de criar os logins em Authentication → Users
--           (Add user → Create new user, marque "Auto Confirm User").
-- Pode rodar de novo sem duplicar nada.

-- ============================================================
-- PARTE 1 — Empresa
-- ============================================================

insert into tenants (slug, name, primary_color, call_origins, cnpj, address, call_form_config)
values (
  'eletromark-refrigeracoes',
  'Eletromark Refrigerações',
  '#2563eb',
  array['Indicação', 'WhatsApp', 'Telefone', 'Google'],
  '58.139.838/0001-40',
  'Rua Moreira, 261 - Pirajá, Belo Horizonte-MG',
  jsonb_build_object(
    -- Liga todas as funções que a Rodrigues usa
    'rodrigues_custom', true,
    -- Horário comercial (base da comissão fora do horário) — mesmo da
    -- Rodrigues por enquanto; o gestor muda em Configurações
    'business_hours', jsonb_build_object(
      'weekday_start', '08:00', 'weekday_end', '18:00',
      'saturday_start', '08:00', 'saturday_end', '13:00'
    ),
    -- Cabeçalho da OS / orçamento / laudo: os dados DELE (sem isso os
    -- documentos saem com os dados da Rodrigues). Telefone, Instagram e
    -- PIX ficam em branco até ele mandar.
    'document_header', jsonb_build_object(
      'name', 'ELETROMARK REFRIGERAÇÕES',
      'legal_name', 'ELETROMARK REFRIGERAÇÕES',
      'cnpj', '58.139.838/0001-40',
      'address_lines', jsonb_build_array('Rua Moreira, 261', 'Pirajá, Belo Horizonte-MG'),
      'phone', '',
      'instagram', '',
      'city', 'Belo Horizonte',
      'pix', '',
      'payment_methods', 'Boleto, transferência bancária, dinheiro, cartão de crédito, cartão de débito, pix ou link de pagamento.'
    )
  )
)
on conflict (slug) do update
  set name = excluded.name,
      cnpj = excluded.cnpj,
      address = excluded.address,
      call_form_config = coalesce(tenants.call_form_config, '{}'::jsonb) || excluded.call_form_config;

-- Mesmos tipos de serviço que a Rodrigues usa (geladeira, freezer...)
insert into service_types (tenant_id, name)
select e.id, s.name
from tenants e
join tenants r on r.slug = 'rodrigues-refrigeracao'
join service_types s on s.tenant_id = r.id
where e.slug = 'eletromark-refrigeracoes'
on conflict (tenant_id, name) do nothing;

-- Conferir a empresa
select name, slug, cnpj, call_form_config ->> 'rodrigues_custom' as funcoes_rodrigues,
  (select count(*) from service_types st where st.tenant_id = t.id) as tipos_de_servico
from tenants t where slug = 'eletromark-refrigeracoes';


-- ============================================================
-- PARTE 2 — Logins (rode depois de criar os usuários no Authentication)
-- ============================================================
-- Troque os e-mails e nomes abaixo pelos que você criou.
-- Gestor: 1 linha. Técnicos: uma linha por técnico (apague as que sobrarem).
-- O sistema acha o usuário pelo e-mail, não precisa copiar UID.
/*
do $$
declare
  v_tenant uuid;
  v_uid uuid;
  v_aux uuid;
  r record;
begin
  select id into v_tenant from tenants where slug = 'eletromark-refrigeracoes';
  if v_tenant is null then raise exception 'Rode a PARTE 1 primeiro.'; end if;

  for r in
    select * from (values
      ('gestor',  'eletromark@gmail.com', 'Eletromark Refrigerações'),   -- GESTOR
      ('tecnico', 'tecnico1@gmail.com',   'Nome do Técnico 1'),
      ('tecnico', 'tecnico2@gmail.com',   'Nome do Técnico 2'),
      ('tecnico', 'tecnico3@gmail.com',   'Nome do Técnico 3'),
      ('tecnico', 'tecnico4@gmail.com',   'Nome do Técnico 4'),
      ('tecnico', 'tecnico5@gmail.com',   'Nome do Técnico 5')
    ) as x(tipo, email, nome)
  loop
    select id into v_uid from auth.users where lower(email) = lower(trim(r.email));
    if v_uid is null then
      raise notice 'NÃO ACHEI o login %: crie em Authentication → Users e rode de novo.', r.email;
      continue;
    end if;

    if r.tipo = 'gestor' then
      insert into profiles (id, tenant_id, name, role) values (v_uid, v_tenant, r.nome, 'admin')
      on conflict (id) do update set tenant_id = excluded.tenant_id, role = 'admin', name = excluded.name;
    else
      insert into profiles (id, tenant_id, name, role) values (v_uid, v_tenant, r.nome, 'tecnico')
      on conflict (id) do update set tenant_id = excluded.tenant_id, role = 'tecnico', name = excluded.name;

      -- Cadastro do técnico (comissão começa em 0; o gestor ajusta em Configurações)
      select id into v_aux from auxiliaries
      where tenant_id = v_tenant and (profile_id = v_uid or lower(trim(name)) = lower(trim(r.nome)))
      limit 1;
      if v_aux is null then
        insert into auxiliaries (tenant_id, name, percentage, type, profile_id)
        values (v_tenant, r.nome, 0, 'tecnico', v_uid);
      else
        update auxiliaries set profile_id = v_uid, type = 'tecnico', name = r.nome where id = v_aux;
      end if;
    end if;
    raise notice 'OK: % (%)', r.email, r.tipo;
  end loop;
end $$;

-- Conferir os logins
select u.email, p.name, p.role
from profiles p join auth.users u on u.id = p.id
where p.tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes')
order by p.role, p.name;
*/
