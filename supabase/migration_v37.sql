-- Migration v37 — Rodrigues: assinatura do cliente na ordem de serviço.
--
-- Rode DEPOIS da v36. O técnico (ou o gestor) abre a OS, o cliente assina
-- com o dedo no celular e a assinatura sai no PDF. Fica numa tabela à
-- parte pra não pesar as listas de chamados. Os outros clientes não usam.
--
-- A assinatura da EMPRESA (documentos já pré-assinados) não precisa de
-- tabela: fica nas configurações da conta.

create table if not exists os_signatures (
  service_order_id uuid primary key references service_orders(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_signature text not null,          -- imagem (PNG) da assinatura
  signed_at timestamptz not null default now()
);

alter table os_signatures enable row level security;

-- Gestor: todas da empresa. Técnico: só as OS dos chamados dele.
drop policy if exists "os_signatures_all" on os_signatures;
create policy "os_signatures_all" on os_signatures for all using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or service_order_id in (
    select so.id from service_orders so join calls c on c.id = so.call_id
    where c.technician_id = my_auxiliary_id()))
) with check (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or service_order_id in (
    select so.id from service_orders so join calls c on c.id = so.call_id
    where c.technician_id = my_auxiliary_id()))
);

notify pgrst, 'reload schema';

-- Conferir: tem que aparecer 1
select count(*) as tabela_assinaturas from information_schema.tables where table_name = 'os_signatures';
