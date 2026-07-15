// Mock data for demo mode — no real database involved

export const COMPANY = 'Nome da Empresa'

export const MOCK_CALLS = [
  { id: 'OS-001', date: '2026-07-01', contact_name: 'Carlos Alberto Souza',   contact_phone: '(11) 98765-4321', origin: 'whatsapp',  status: 'aprovado',        notes: 'Vazamento principal na cozinha.',       call_address: 'Rua das Flores, 142',    call_city: 'São Paulo', call_neighborhood: 'Jardim Paulista',  contact_cpf: '123.456.789-00', service_category: 'Hidráulica',     os_number: 'OS-001', total_value: 18000, payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-002', date: '2026-07-02', contact_name: 'Fernanda Lima',          contact_phone: '(11) 91234-5678', origin: 'indicacao', status: 'aprovado',        notes: 'Reforma completa do banheiro.',        call_address: 'Av. Paulista, 900',      call_city: 'São Paulo', call_neighborhood: 'Bela Vista',       contact_cpf: '987.654.321-00', service_category: 'Reforma',        os_number: 'OS-002', total_value: 13000, payment_method: 'Cartão',        payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-003', date: '2026-07-02', contact_name: 'Roberto Mendes',         contact_phone: '(11) 97777-3333', origin: 'whatsapp',  status: 'aprovado',        notes: 'Instalação painel elétrico completo.', call_address: 'Rua Augusta, 320',       call_city: 'São Paulo', call_neighborhood: 'Consolação',       contact_cpf: '456.789.123-00', service_category: 'Elétrica',       os_number: 'OS-003', total_value: 11000, payment_method: 'PIX + Cartão',  payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-004', date: '2026-07-03', contact_name: 'Patricia Alves',         contact_phone: '(11) 94444-0000', origin: 'site',      status: 'aprovado',        notes: 'AC split 5 ambientes.',                call_address: 'Rua Haddock Lobo, 180',  call_city: 'São Paulo', call_neighborhood: 'Higienópolis',     contact_cpf: '321.654.987-00', service_category: 'Ar-condicionado', os_number: 'OS-004', total_value: 9500,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-005', date: '2026-07-03', contact_name: 'Gustavo Ferreira',       contact_phone: '(11) 99001-2345', origin: 'indicacao', status: 'aprovado',        notes: 'Infiltração e reparo estrutural.',     call_address: 'Rua Oscar Freire, 200',  call_city: 'São Paulo', call_neighborhood: 'Jardins',          contact_cpf: '111.222.333-44', service_category: 'Hidráulica',     os_number: 'OS-005', total_value: 8200,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-006', date: '2026-07-04', contact_name: 'Amanda Rodrigues',       contact_phone: '(11) 98877-6655', origin: 'whatsapp',  status: 'aprovado',        notes: 'Quadro de distribuição elétrica.',     call_address: 'Alameda Santos, 450',    call_city: 'São Paulo', call_neighborhood: 'Cerqueira César',  contact_cpf: '222.333.444-55', service_category: 'Elétrica',       os_number: 'OS-006', total_value: 7800,  payment_method: 'Cartão',        payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-007', date: '2026-07-05', contact_name: 'Lucas Oliveira',         contact_phone: '(11) 97654-3210', origin: 'instagram', status: 'aprovado',        notes: 'Reforma banheiro + suite.',            call_address: 'Rua Pamplona, 800',      call_city: 'São Paulo', call_neighborhood: 'Itaim Bibi',       contact_cpf: '333.444.555-66', service_category: 'Reforma',        os_number: 'OS-007', total_value: 7200,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-008', date: '2026-07-06', contact_name: 'Camila Santos',          contact_phone: '(11) 96543-2109', origin: 'telefone',  status: 'aprovado',        notes: 'AC 3 splits instalação completa.',     call_address: 'Rua da Consolação, 300', call_city: 'São Paulo', call_neighborhood: 'Consolação',       contact_cpf: '444.555.666-77', service_category: 'Ar-condicionado', os_number: 'OS-008', total_value: 6500,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-009', date: '2026-07-07', contact_name: 'Diego Martins',          contact_phone: '(11) 95432-1098', origin: 'whatsapp',  status: 'aprovado',        notes: 'Cano principal rompido, urgente.',     call_address: 'Av. Rebouças, 1200',     call_city: 'São Paulo', call_neighborhood: 'Pinheiros',        contact_cpf: '555.666.777-88', service_category: 'Hidráulica',     os_number: 'OS-009', total_value: 5800,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-010', date: '2026-07-07', contact_name: 'Isabela Costa',          contact_phone: '(11) 94321-0987', origin: 'indicacao', status: 'aprovado',        notes: 'Instalação elétrica nova área.',       call_address: 'Rua Frei Caneca, 500',   call_city: 'São Paulo', call_neighborhood: 'Centro',           contact_cpf: '666.777.888-99', service_category: 'Elétrica',       os_number: 'OS-010', total_value: 5200,  payment_method: 'Cartão',        payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-011', date: '2026-07-08', contact_name: 'Rafael Pereira',         contact_phone: '(11) 93210-9876', origin: 'whatsapp',  status: 'aprovado',        notes: 'Manutenção AC + carga gás.',           call_address: 'Rua Lorena, 650',        call_city: 'São Paulo', call_neighborhood: 'Jardins',          contact_cpf: '777.888.999-00', service_category: 'Ar-condicionado', os_number: 'OS-011', total_value: 4800,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-012', date: '2026-07-08', contact_name: 'Juliana Mendes',         contact_phone: '(11) 92109-8765', origin: 'site',      status: 'aprovado',        notes: 'Renovação hidráulica cozinha.',        call_address: 'Av. Europa, 300',        call_city: 'São Paulo', call_neighborhood: 'Jardim Europa',    contact_cpf: '888.999.000-11', service_category: 'Hidráulica',     os_number: 'OS-012', total_value: 4500,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-013', date: '2026-07-09', contact_name: 'Thiago Barbosa',         contact_phone: '(11) 91098-7654', origin: 'indicacao', status: 'aprovado',        notes: 'Quadro elétrico + circuitos.',         call_address: 'Rua Itapeva, 120',       call_city: 'São Paulo', call_neighborhood: 'Bela Vista',       contact_cpf: '999.000.111-22', service_category: 'Elétrica',       os_number: 'OS-013', total_value: 4200,  payment_method: 'PIX',           payment_status: 'pago_parcial',  team: 'Equipe Alpha' },
  { id: 'OS-014', date: '2026-07-09', contact_name: 'Bianca Neves',           contact_phone: '(11) 90987-6543', origin: 'whatsapp',  status: 'aprovado',        notes: 'AC split instalação sala.',            call_address: 'Rua Groenlândia, 400',   call_city: 'São Paulo', call_neighborhood: 'Jardins',          contact_cpf: '000.111.222-33', service_category: 'Ar-condicionado', os_number: 'OS-014', total_value: 3800,  payment_method: 'Cartão',        payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-015', date: '2026-07-10', contact_name: 'Vitor Gomes',            contact_phone: '(11) 89876-5432', origin: 'instagram', status: 'aprovado',        notes: 'Hidráulica lavanderia e banheiro.',    call_address: 'Rua Mourato Coelho, 700',call_city: 'São Paulo', call_neighborhood: 'Pinheiros',        contact_cpf: '111.333.555-77', service_category: 'Hidráulica',     os_number: 'OS-015', total_value: 3500,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-016', date: '2026-07-10', contact_name: 'Larissa Cardoso',        contact_phone: '(11) 88765-4321', origin: 'telefone',  status: 'aprovado',        notes: 'Serviço elétrico urgente.',            call_address: 'Av. Rebouças, 2400',     call_city: 'São Paulo', call_neighborhood: 'Perdizes',         contact_cpf: '222.444.666-88', service_category: 'Elétrica',       os_number: 'OS-016', total_value: 3200,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Beta'  },
  { id: 'OS-017', date: '2026-07-11', contact_name: 'Henrique Lopes',         contact_phone: '(11) 87654-3210', origin: 'whatsapp',  status: 'aprovado',        notes: 'Hidráulica básica — torneiras.',       call_address: 'Rua Aspicuelta, 800',    call_city: 'São Paulo', call_neighborhood: 'Vila Madalena',    contact_cpf: '333.555.777-99', service_category: 'Hidráulica',     os_number: 'OS-017', total_value: 2800,  payment_method: 'PIX',           payment_status: 'pago',          team: 'Equipe Alpha' },
  { id: 'OS-018', date: '2026-07-11', contact_name: 'Natália Pinto',          contact_phone: '(11) 86543-2109', origin: 'indicacao', status: 'aprovado',        notes: 'Elétrica leve, 2 pontos novos.',       call_address: 'Rua Fidalga, 200',       call_city: 'São Paulo', call_neighborhood: 'Vila Madalena',    contact_cpf: '444.666.888-00', service_category: 'Elétrica',       os_number: 'OS-018', total_value: 2000,  payment_method: 'PIX',           payment_status: 'pendente',      team: 'Equipe Beta'  },
  { id: 'OS-019', date: '2026-07-12', contact_name: 'Bruno Almeida',          contact_phone: '(11) 85432-1098', origin: 'whatsapp',  status: 'agendado',        notes: 'Vistoria e orçamento AC.',             call_address: 'Rua Joaquim Antunes, 50',call_city: 'São Paulo', call_neighborhood: 'Pinheiros',        contact_cpf: null,             service_category: 'Ar-condicionado', os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
  { id: 'OS-020', date: '2026-07-12', contact_name: 'Priscila Rocha',         contact_phone: '(11) 84321-0987', origin: 'site',      status: 'agendado',        notes: 'Vazamento no banheiro.',               call_address: 'Av. Faria Lima, 3000',   call_city: 'São Paulo', call_neighborhood: 'Itaim Bibi',       contact_cpf: null,             service_category: 'Hidráulica',     os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
  { id: 'OS-021', date: '2026-07-13', contact_name: 'Marcos Vieira',          contact_phone: '(11) 83210-9876', origin: 'whatsapp',  status: 'agendado',        notes: 'Orçamento elétrica.',                  call_address: 'Rua Teodoro Sampaio, 900',call_city:'São Paulo', call_neighborhood: 'Pinheiros',        contact_cpf: null,             service_category: 'Elétrica',       os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
  { id: 'OS-022', date: '2026-07-13', contact_name: 'Cláudia Teixeira',       contact_phone: '(11) 82109-8765', origin: 'instagram', status: 'aberto',          notes: 'Cliente pediu retorno.',               call_address: 'Rua Capote Valente, 400',call_city: 'São Paulo', call_neighborhood: 'Pinheiros',        contact_cpf: null,             service_category: 'Hidráulica',     os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
  { id: 'OS-023', date: '2026-07-14', contact_name: 'André Ribeiro',          contact_phone: '(11) 81098-7654', origin: 'telefone',  status: 'nao_aprovou',     notes: 'Valor acima do esperado pelo cliente.',call_address: 'Rua Cardeal Arcoverde, 300',call_city:'São Paulo',call_neighborhood:'Pinheiros',      contact_cpf: null,             service_category: 'Reforma',        os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
  { id: 'OS-024', date: '2026-07-14', contact_name: 'Letícia Duarte',         contact_phone: '(11) 80987-6543', origin: 'whatsapp',  status: 'nao_quis_visita', notes: 'Não quis receber visita.',             call_address: 'Av. Sumaré, 200',        call_city: 'São Paulo', call_neighborhood: 'Sumaré',           contact_cpf: null,             service_category: 'Hidráulica',     os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
  { id: 'OS-025', date: '2026-07-15', contact_name: 'Rodrigo Siqueira',       contact_phone: '(11) 79876-5432', origin: 'indicacao', status: 'cancelado',       notes: 'Cancelado pelo cliente.',              call_address: 'Rua Vergueiro, 1500',    call_city: 'São Paulo', call_neighborhood: 'Paraíso',          contact_cpf: null,             service_category: 'Elétrica',       os_number: null,     total_value: null,  payment_method: null,            payment_status: null,            team: null           },
]

export const MOCK_EXPENSES = [
  { id: 'e1',  description: 'Salário — João Técnico',      category: 'salario',     amount: 4200,  status: 'pago',     due_date: '2026-07-01', type: 'fixo'   },
  { id: 'e2',  description: 'Salário — Pedro Auxiliar',    category: 'salario',     amount: 2800,  status: 'pago',     due_date: '2026-07-01', type: 'fixo'   },
  { id: 'e3',  description: 'Salário — Motorista',         category: 'salario',     amount: 2500,  status: 'pago',     due_date: '2026-07-01', type: 'fixo'   },
  { id: 'e4',  description: 'Aluguel escritório/galpão',   category: 'aluguel',     amount: 3200,  status: 'pago',     due_date: '2026-07-05', type: 'fixo'   },
  { id: 'e5',  description: 'Combustível — frota julho',   category: 'combustivel', amount: 2800,  status: 'pago',     due_date: '2026-07-05', type: 'fixo'   },
  { id: 'e6',  description: 'Material hidráulico lote 1',  category: 'material',    amount: 5200,  status: 'pago',     due_date: '2026-07-06', type: 'avulso' },
  { id: 'e7',  description: 'Material elétrico lote 1',    category: 'material',    amount: 4800,  status: 'pago',     due_date: '2026-07-07', type: 'avulso' },
  { id: 'e8',  description: 'Material AC peças e gás',     category: 'material',    amount: 3500,  status: 'pago',     due_date: '2026-07-08', type: 'avulso' },
  { id: 'e9',  description: 'Alimentação equipe',          category: 'alimentacao', amount: 1200,  status: 'pago',     due_date: '2026-07-10', type: 'avulso' },
  { id: 'e10', description: 'Manutenção veículos',         category: 'manutencao',  amount: 1800,  status: 'pago',     due_date: '2026-07-12', type: 'avulso' },
  { id: 'e11', description: 'Software e ferramentas',      category: 'outros',      amount: 890,   status: 'pago',     due_date: '2026-07-05', type: 'fixo'   },
  { id: 'e12', description: 'Material hidráulico lote 2',  category: 'material',    amount: 4200,  status: 'pendente', due_date: '2026-07-20', type: 'avulso' },
  { id: 'e13', description: 'Material elétrico lote 2',    category: 'material',    amount: 3600,  status: 'pendente', due_date: '2026-07-22', type: 'avulso' },
  { id: 'e14', description: 'Combustível — 2ª quinzena',   category: 'combustivel', amount: 2100,  status: 'pendente', due_date: '2026-07-20', type: 'fixo'   },
  { id: 'e15', description: 'Conta de energia galpão',     category: 'outros',      amount: 650,   status: 'pendente', due_date: '2026-07-25', type: 'fixo'   },
]

export const MOCK_ENTRADAS = [
  { id: 'c1',  description: 'OS-001 — Carlos Alberto Souza',   amount: 18000, status: 'pago',     due_date: '2026-07-01', entry_type: 'servico' },
  { id: 'c2',  description: 'OS-002 — Fernanda Lima',          amount: 13000, status: 'pago',     due_date: '2026-07-02', entry_type: 'servico' },
  { id: 'c3',  description: 'OS-003 — Roberto Mendes',         amount: 11000, status: 'pago',     due_date: '2026-07-02', entry_type: 'servico' },
  { id: 'c4',  description: 'OS-004 — Patricia Alves',         amount: 9500,  status: 'pago',     due_date: '2026-07-03', entry_type: 'servico' },
  { id: 'c5',  description: 'OS-005 — Gustavo Ferreira',       amount: 8200,  status: 'pago',     due_date: '2026-07-03', entry_type: 'servico' },
  { id: 'c6',  description: 'OS-006 — Amanda Rodrigues',       amount: 7800,  status: 'pago',     due_date: '2026-07-04', entry_type: 'servico' },
  { id: 'c7',  description: 'OS-007 — Lucas Oliveira',         amount: 7200,  status: 'pago',     due_date: '2026-07-05', entry_type: 'servico' },
  { id: 'c8',  description: 'OS-008 — Camila Santos',          amount: 6500,  status: 'pago',     due_date: '2026-07-06', entry_type: 'servico' },
  { id: 'c9',  description: 'OS-009 — Diego Martins',          amount: 5800,  status: 'pago',     due_date: '2026-07-07', entry_type: 'servico' },
  { id: 'c10', description: 'OS-010 — Isabela Costa',          amount: 5200,  status: 'pago',     due_date: '2026-07-07', entry_type: 'servico' },
  { id: 'c11', description: 'OS-011 — Rafael Pereira',         amount: 4800,  status: 'pago',     due_date: '2026-07-08', entry_type: 'servico' },
  { id: 'c12', description: 'OS-012 — Juliana Mendes',         amount: 4500,  status: 'pago',     due_date: '2026-07-08', entry_type: 'servico' },
  { id: 'c13', description: 'OS-013 sinal — Thiago Barbosa',   amount: 2100,  status: 'pago',     due_date: '2026-07-09', entry_type: 'servico' },
  { id: 'c14', description: 'OS-014 — Bianca Neves',           amount: 3800,  status: 'pago',     due_date: '2026-07-09', entry_type: 'servico' },
  { id: 'c15', description: 'OS-015 — Vitor Gomes',            amount: 3500,  status: 'pago',     due_date: '2026-07-10', entry_type: 'servico' },
  { id: 'c16', description: 'OS-016 — Larissa Cardoso',        amount: 3200,  status: 'pago',     due_date: '2026-07-10', entry_type: 'servico' },
  { id: 'c17', description: 'OS-017 — Henrique Lopes',         amount: 2800,  status: 'pago',     due_date: '2026-07-11', entry_type: 'servico' },
  { id: 'c18', description: 'OS-013 restante — Thiago Barbosa',amount: 2100,  status: 'pendente', due_date: '2026-07-20', entry_type: 'servico' },
  { id: 'c19', description: 'OS-018 — Natália Pinto',          amount: 2000,  status: 'pendente', due_date: '2026-07-25', entry_type: 'servico' },
]

export const MOCK_CLIENTS = [
  { id: 'cl1',  name: 'Carlos Alberto Souza', phone: '(11) 98765-4321', city: 'São Paulo', neighborhood: 'Jardim Paulista',  calls: 3 },
  { id: 'cl2',  name: 'Fernanda Lima',        phone: '(11) 91234-5678', city: 'São Paulo', neighborhood: 'Bela Vista',        calls: 2 },
  { id: 'cl3',  name: 'Roberto Mendes',       phone: '(11) 97777-3333', city: 'São Paulo', neighborhood: 'Consolação',        calls: 4 },
  { id: 'cl4',  name: 'Patricia Alves',       phone: '(11) 94444-0000', city: 'São Paulo', neighborhood: 'Higienópolis',      calls: 2 },
  { id: 'cl5',  name: 'Gustavo Ferreira',     phone: '(11) 99001-2345', city: 'São Paulo', neighborhood: 'Jardins',            calls: 1 },
  { id: 'cl6',  name: 'Amanda Rodrigues',     phone: '(11) 98877-6655', city: 'São Paulo', neighborhood: 'Cerqueira César',    calls: 2 },
  { id: 'cl7',  name: 'Lucas Oliveira',       phone: '(11) 97654-3210', city: 'São Paulo', neighborhood: 'Itaim Bibi',        calls: 1 },
  { id: 'cl8',  name: 'Camila Santos',        phone: '(11) 96543-2109', city: 'São Paulo', neighborhood: 'Consolação',        calls: 1 },
  { id: 'cl9',  name: 'Diego Martins',        phone: '(11) 95432-1098', city: 'São Paulo', neighborhood: 'Pinheiros',         calls: 2 },
  { id: 'cl10', name: 'Isabela Costa',        phone: '(11) 94321-0987', city: 'São Paulo', neighborhood: 'Centro',            calls: 1 },
  { id: 'cl11', name: 'Rafael Pereira',       phone: '(11) 93210-9876', city: 'São Paulo', neighborhood: 'Jardins',            calls: 2 },
  { id: 'cl12', name: 'Juliana Mendes',       phone: '(11) 92109-8765', city: 'São Paulo', neighborhood: 'Jardim Europa',     calls: 1 },
]

export const MOCK_QUOTES = [
  { id: 'q1', quote_number: 'ORC-001', client_name: 'Ricardo Oliveira',   total: 12500, status: 'aprovado', created_at: '2026-07-01', valid_until: '2026-07-16' },
  { id: 'q2', quote_number: 'ORC-002', client_name: 'Luciana Ferreira',   total: 8900,  status: 'aprovado', created_at: '2026-07-03', valid_until: '2026-07-18' },
  { id: 'q3', quote_number: 'ORC-003', client_name: 'Daniel Rodrigues',   total: 15200, status: 'pendente', created_at: '2026-07-08', valid_until: '2026-07-23' },
  { id: 'q4', quote_number: 'ORC-004', client_name: 'Ana Paula Castro',   total: 6800,  status: 'pendente', created_at: '2026-07-10', valid_until: '2026-07-25' },
  { id: 'q5', quote_number: 'ORC-005', client_name: 'Guilherme Santos',   total: 4200,  status: 'recusado', created_at: '2026-07-05', valid_until: null },
  { id: 'q6', quote_number: 'ORC-006', client_name: 'Mariana Fonseca',    total: 9700,  status: 'pendente', created_at: '2026-07-12', valid_until: '2026-07-27' },
  { id: 'q7', quote_number: 'ORC-007', client_name: 'Alexandre Moura',    total: 3400,  status: 'recusado', created_at: '2026-07-06', valid_until: null },
]

export const MOCK_SUPPLIERS = [
  { id: 's1', name: 'Hidráulica Total',      category: 'Materiais',    phone: '(11) 3333-1111', email: 'contato@hidraulicatotal.com.br' },
  { id: 's2', name: 'Eletro Peças SP',       category: 'Elétrica',     phone: '(11) 4444-2222', email: 'vendas@eletropecas.com.br' },
  { id: 's3', name: 'Ar & Clima Atacado',    category: 'Climatização', phone: '(11) 5555-3333', email: null },
  { id: 's4', name: 'Ferramentas Master',    category: 'Ferramentas',  phone: '(11) 6666-4444', email: 'master@ferramentasmaster.com' },
  { id: 's5', name: 'Distribuidora Alfa',    category: 'Materiais',    phone: '(11) 7777-5555', email: null },
]

export const MOCK_AUXILIARIES = [
  {
    id: 'ax1', name: 'João Técnico',    type: 'Técnico',   percentage: 35,
    total_earned: 42350, paid_earned: 38000, unpaid_earned: 4350, call_count: 18,
  },
  {
    id: 'ax2', name: 'Pedro Auxiliar',  type: 'Auxiliar',  percentage: 15,
    total_earned: 18150, paid_earned: 16000, unpaid_earned: 2150, call_count: 18,
  },
  {
    id: 'ax3', name: 'Marcos Técnico',  type: 'Técnico',   percentage: 30,
    total_earned: 14200, paid_earned: 12500, unpaid_earned: 1700, call_count: 12,
  },
]
