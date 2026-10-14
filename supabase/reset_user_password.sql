-- Define a senha de um usuário diretamente no banco (sem email, sem
-- precisar passar pelo painel). Usa a extensão pgcrypto, que já vem
-- habilitada por padrão nos projetos Supabase.
--
-- Troque a SENHA_NOVA_AQUI pela senha que você quer definir, e o email
-- se for usar para outro usuário.

update auth.users
set encrypted_password = crypt('SENHA_NOVA_AQUI', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where email = 'debora.castroff@gmail.com';

-- Conferir (não mostra a senha, só confirma que o update rodou)
select email, email_confirmed_at, updated_at
from auth.users
where email = 'debora.castroff@gmail.com';
