-- Corrige o vínculo da Debora: ela deve ficar na empresa "Especial BH"
-- que JÁ EXISTE (a mesma que o usuário especialbh@gmail.com usa),
-- não na empresa nova que criamos sem querer.

-- ============================================================
-- 1. Conferir qual é o tenant do especialbh@gmail.com
-- ============================================================
select t.id as tenant_id, t.name, t.slug
from auth.users u
join profiles p on p.id = u.id
join tenants t on t.id = p.tenant_id
where u.email = 'especialbh@gmail.com';

-- ============================================================
-- 2. Mover a Debora para esse mesmo tenant
-- ============================================================
update profiles
set tenant_id = (
  select p.tenant_id
  from auth.users u
  join profiles p on p.id = u.id
  where u.email = 'especialbh@gmail.com'
)
where id = (select id from auth.users where email = 'debora.castroff@gmail.com');

-- ============================================================
-- 3. Conferir: os dois devem aparecer com o mesmo tenant_id
-- ============================================================
select u.email, p.tenant_id, p.role
from auth.users u
join profiles p on p.id = u.id
where u.email in ('especialbh@gmail.com', 'debora.castroff@gmail.com');
