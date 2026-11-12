-- Rodrigues: nome que aparece no "Olá, ...!" do gestor (conta que cadastra
-- os chamados). Os técnicos já aparecem com o nome deles.
-- Troca o nome de TODOS os logins de gestor da Rodrigues (não mexe nos
-- técnicos). Se tiver mais de um gestor, use o segundo comando, por e-mail.

update profiles
set name = 'Victor'
where tenant_id = (select id from tenants where slug = 'rodrigues-refrigeracao')
  and role <> 'tecnico';

-- Um login específico (troque o e-mail e o nome):
-- update profiles set name = 'Fulana'
-- where id = (select id from auth.users where lower(email) = 'email@exemplo.com');

-- Conferir
select u.email, p.name, p.role
from profiles p join auth.users u on u.id = p.id
where p.tenant_id = (select id from tenants where slug = 'rodrigues-refrigeracao')
order by p.role, p.name;
