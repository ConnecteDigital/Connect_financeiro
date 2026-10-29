-- Migration v16 — endereço da empresa (tenants.address), usado no cabeçalho
-- da OS impressa da Rodrigues Refrigeração (e disponível em Configurações
-- > Dados da Empresa para qualquer tenant preencher, se quiser).
--
-- 100% aditivo: nova coluna opcional, não afeta ninguém que não a preencher.

alter table tenants add column if not exists address text;

-- Preenche CNPJ, telefone e endereço da Rodrigues com os dados do
-- certificado de garantia que ele enviou. Ajuste aqui ou depois em
-- Configurações > Dados da Empresa se algo estiver errado.
update tenants
set cnpj = coalesce(cnpj, '45.946.465/0001-78'),
    phone = coalesce(phone, '(31) 97576-2097'),
    address = coalesce(address, 'Rua São João Batista do Glória, 125 - Jardim Leblon, Belo Horizonte - MG')
where slug = 'rodrigues-refrigeracao';

-- Conferir
select name, slug, cnpj, phone, address from tenants where slug = 'rodrigues-refrigeracao';
