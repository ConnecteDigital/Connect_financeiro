-- Migration v26 — técnico não altera o chamado (Rodrigues)
--
-- O técnico deixa de poder editar qualquer campo do chamado (endereço,
-- origem, cliente, status...). Ele só muda o status através de
-- "Iniciar/Encerrar serviço" (funções da v25, que rodam no servidor) e
-- preenche a OS dele (service_orders continua liberado pro chamado dele).
--
-- Para dono/usuário nada muda. Pode rodar mais de uma vez.

drop policy if exists "calls_update" on calls;
create policy "calls_update" on calls for update using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
) with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

notify pgrst, 'reload schema';
