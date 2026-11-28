-- Eletromark Refrigerações: ZERA os testes pra começar a usar de verdade.
--
-- APAGA (só da Eletromark): chamados, OS, visitas, orçamentos, entradas e
-- saídas do financeiro (inclui comissões, Google Ads e abastecimentos),
-- devoluções e assinaturas de OS. A numeração volta pra CH-00001 / OS-00001.
-- As peças usadas nas OS de teste VOLTAM pro estoque de cada técnico.
--
-- NÃO MEXE em: logins, técnicos e comissões (%), estoque cadastrado,
-- tipos de serviço, aparelhos, configurações, logo, assinatura da empresa
-- e dos técnicos, bloqueios de agenda.
--
-- PASSO 1 — só confere o que vai ser apagado (não apaga nada).
-- PASSO 2 — apaga.

-- ============================================================
-- PASSO 1 — Conferir
-- ============================================================
with t as (select id from tenants where slug = 'eletromark-refrigeracoes')
select
  (select name from tenants where id = (select id from t)) as empresa,
  (select count(*) from calls where tenant_id = (select id from t)) as chamados,
  (select count(*) from service_orders where tenant_id = (select id from t)) as ordens_de_servico,
  (select count(*) from quotes where tenant_id = (select id from t)) as orcamentos,
  (select count(*) from expenses where tenant_id = (select id from t)) as saidas_e_comissoes,
  (select count(*) from cash_entries where tenant_id = (select id from t)) as entradas,
  (select count(*) from fuel_logs where tenant_id = (select id from t)) as abastecimentos,
  (select count(*) from clients where tenant_id = (select id from t)) as clientes_cadastrados;


-- ============================================================
-- PASSO 2 — Zerar (rode depois de conferir o passo 1)
-- ============================================================
do $$
declare
  v_tenant uuid;
  v_n int;
begin
  select id into v_tenant from tenants where slug = 'eletromark-refrigeracoes';
  if v_tenant is null then raise exception 'Eletromark não encontrada.'; end if;

  -- Devolve ao estoque as peças usadas nas OS de teste
  update stock_items s
  set quantity = s.quantity + u.qtd
  from (
    select p.stock_item_id, sum(p.quantity) as qtd
    from service_order_parts p
    join service_orders so on so.id = p.service_order_id
    where so.tenant_id = v_tenant and p.stock_item_id is not null
    group by p.stock_item_id
  ) u
  where s.id = u.stock_item_id and s.tenant_id = v_tenant;
  get diagnostics v_n = row_count;
  raise notice '% peças devolvidas ao estoque.', v_n;

  -- Financeiro (comissões, Google Ads, gasolina, saídas e entradas)
  delete from expenses where tenant_id = v_tenant;
  delete from cash_entries where tenant_id = v_tenant;
  delete from fuel_logs where tenant_id = v_tenant;

  -- Orçamentos, OS (itens, peças, devoluções e assinaturas vão junto) e chamados (visitas vão junto)
  delete from quotes where tenant_id = v_tenant;
  delete from service_orders where tenant_id = v_tenant;
  delete from calls where tenant_id = v_tenant;

  -- Numeração recomeça: CH-00001, OS-00001
  delete from tenant_sequences where tenant_id = v_tenant and sequence_name in ('call', 'os');

  raise notice 'Eletromark zerada.';
end $$;

-- Conferir depois: tudo tem que estar 0
with t as (select id from tenants where slug = 'eletromark-refrigeracoes')
select
  (select count(*) from calls where tenant_id = (select id from t)) as chamados,
  (select count(*) from service_orders where tenant_id = (select id from t)) as ordens_de_servico,
  (select count(*) from expenses where tenant_id = (select id from t)) as saidas_e_comissoes,
  (select count(*) from cash_entries where tenant_id = (select id from t)) as entradas;


-- ============================================================
-- OPCIONAL — apagar também os clientes cadastrados nos testes
-- (só rode se ele não cadastrou nenhum cliente de verdade)
-- ============================================================
-- delete from clients where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes');
-- delete from tenant_sequences where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes') and sequence_name = 'client';
