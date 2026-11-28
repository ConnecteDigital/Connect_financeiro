-- Conta Loja da Rodrigues: cadastra as peças da lista de uma vez no estoque
-- da loja. Custo e venda ficam zerados — ele preenche pelo aplicativo.
-- Peça que já existe com o mesmo nome NÃO é duplicada nem tem a
-- quantidade mexida (aparece em "ja_existia" no resultado).
-- Pode rodar de novo sem duplicar.

with loja as (
  select id from tenants where slug = 'rodrigues-loja'
),
lista(quantidade, nome) as (values
    (20, 'SENSOR BRASTEMP'),
    (6, 'FUSÍVEL TÉRMICO BRASTEMP'),
    (2, 'BIMETAL'),
    (2, 'SENSOR GE'),
    (7, 'SENSOR ELECTROLUX'),
    (1, 'TERMOSTATO DAKO'),
    (1, 'TERMOSTATO DC49'),
    (2, 'TERMOSTATO CÔNSUL 1 PORTA SEM DEGELO'),
    (4, 'TERMOSTATO ELECTROLUX SEM DEGELO'),
    (3, 'TERMOSTATO ELECTROLUX COM DEGELO'),
    (4, 'TERMOSTATO CÔNSUL COM DEGELO'),
    (2, 'TERMOSTATO BALCÃO 13600'),
    (1, 'TERMOSTATO BEBEDOURO'),
    (3, 'DOBRADIÇA CÔNSUL CRC38'),
    (1, 'RESISTÊNCIA DEGELO VIDRO GE'),
    (3, 'RELÉ 127V'),
    (1, 'PROTETOR 127V'),
    (2, 'RELÉ 220V'),
    (3, 'PROTETOR 220V'),
    (1, 'MOTOR VENTILADOR BOSCH SUPERIOR 127V'),
    (3, 'MOTOR VENTILADOR BOSCH INFERIOR 127V'),
    (1, 'MICRO MOTOR 1/100 220V'),
    (10, 'COOLER BEBEDOURO'),
    (2, 'VENTILADOR BRASTEMP'),
    (2, 'CAPILAR 0,31'),
    (3, 'CAPILAR 0,36'),
    (1, 'RESISTÊNCIA DRENO GE'),
    (20, 'VÁLVULA SCHRADER'),
    (9, 'FILTRO'),
    (2, 'TERMOSTATO MICRO-ONDAS'),
    (1, 'KIT RADIAÇÃO ELECTROLUX TF55'),
    (6, 'COMPRESSOR 1/4'),
    (4, 'LATA GÁS R134'),
    (3, 'REFIL MAÇARICO'),
    (3, 'LATA GÁS R600'),
    (3, 'LATA GÁS R290'),
    (1, 'COMPRESSOR 1/3 ELECTROLUX'),
    (1, 'TRANSMISSÃO LTC10'),
    (2, 'KIT CUNHA E PARAFUSO BRASTEMP'),
    (2, 'RETENTOR ELECTROLUX'),
    (2, 'ROLAMENTO BRASTEMP'),
    (1, 'RETENTOR LAVA E SECA SAMSUNG'),
    (3, 'PINO DA PORTA DF50'),
    (2, 'KIT PINO COM MOLA LTC10'),
    (1, 'TRAVA DA PORTA MULTI MODELOS ELECTROLUX'),
    (1, 'PLACA DE POTÊNCIA BRE57'),
    (1, 'RESISTÊNCIA BRE80'),
    (3, 'RESISTÊNCIA DF50 ORIGINAL'),
    (3, 'RESISTÊNCIA DF52 ORIGINAL'),
    (1, 'RESISTÊNCIA CÔNSUL 1 PORTA'),
    (3, 'CAPA INTERMEDIÁRIA DF52'),
    (2, 'CAPA TRASEIRA DF52'),
    (2, 'CAPA BRM39'),
    (1, 'CAPA BRE50'),
    (2, 'CAPA BRE51'),
    (2, 'CAPA CRC38'),
    (3, 'CAPA BRM45'),
    (1, 'CAPA DB52'),
    (3, 'CAPA DF35'),
    (2, 'CAPA CRM45'),
    (1, 'AGITADOR BRASTEMP ORIGINAL'),
    (4, 'TIRANTE BRANCO'),
    (1, 'TIRANTE PRETO'),
    (1, 'PLACA INTERFACE LED13/14/15/17'),
    (1, 'POLIA LISA BRASTEMP'),
    (1, 'POLIA LISA ELECTROLUX 15KG'),
    (1, 'RECIPIENTE DE ÁGUA COMPRESSOR EMBRACO ANTIGO')
),
novas as (
  insert into stock_items (tenant_id, auxiliary_id, kind, name, quantity, unit_value, sale_value)
  select loja.id, null, 'peca', l.nome, l.quantidade, 0, 0
  from lista l cross join loja
  where not exists (
    select 1 from stock_items s
    where s.tenant_id = loja.id and s.auxiliary_id is null and lower(trim(s.name)) = lower(l.nome)
  )
  returning name
)
select
  (select count(*) from lista) as pecas_na_lista,
  (select count(*) from novas) as cadastradas_agora,
  (select string_agg(l.nome, ', ') from lista l where l.nome not in (select name from novas)) as ja_existia;
