-- Confirma manualmente o email de um usuário criado sem "Auto Confirm User"
-- (sem isso o Supabase bloqueia o login por email não confirmado).
-- Troque o email abaixo se for usar para outro usuário no futuro.

update auth.users
set email_confirmed_at = now()
where email = 'debora.castroff@gmail.com';

-- Conferir
select email, email_confirmed_at from auth.users where email = 'debora.castroff@gmail.com';
