import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, Tool, SchemaType } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'criar_chamado',
        description: 'Cria um novo chamado/atendimento no sistema. Use quando o usuário pedir para criar, lançar ou registrar um chamado, cliente ou atendimento.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            contact_name: { type: SchemaType.STRING, description: 'Nome do cliente ou contato' },
            service_category: {
              type: SchemaType.STRING,
              description: 'Categoria do serviço. Valores válidos: Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros',
            },
            status: {
              type: SchemaType.STRING,
              description: 'Status do chamado: "imediato" (atendimento agora), "agendado" (com data e hora marcadas), "aprovado" (aprovado para execução)',
            },
            scheduled_date: {
              type: SchemaType.STRING,
              description: 'Data do agendamento no formato YYYY-MM-DD (ex: 2026-06-18). Obrigatório quando status=agendado.',
            },
            scheduled_time: {
              type: SchemaType.STRING,
              description: 'Hora do agendamento no formato HH:MM (ex: 14:30). Usar quando status=agendado.',
            },
            notes: { type: SchemaType.STRING, description: 'Observações ou detalhes adicionais do chamado' },
            driver: { type: SchemaType.STRING, description: 'Nome do técnico responsável pelo atendimento' },
            call_address: { type: SchemaType.STRING, description: 'Endereço do atendimento' },
            call_neighborhood: { type: SchemaType.STRING, description: 'Bairro' },
            call_city: { type: SchemaType.STRING, description: 'Cidade' },
            contact_phone: { type: SchemaType.STRING, description: 'Telefone do cliente' },
            solicitante: { type: SchemaType.STRING, description: 'Nome de quem fez a solicitação/ligou' },
          },
          required: ['contact_name', 'service_category', 'status'],
        },
      },
      {
        name: 'listar_chamados',
        description: 'Lista os chamados recentes do sistema. Use quando o usuário perguntar sobre chamados, atendimentos ou quiser ver o que tem registrado.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            status: {
              type: SchemaType.STRING,
              description: 'Filtrar por status: imediato, agendado, aprovado, nao_aprovou, cancelado, nao_quis_visita. Deixar vazio para todos.',
            },
            limit: {
              type: SchemaType.NUMBER,
              description: 'Quantidade de chamados a retornar (padrão: 5, máximo: 20)',
            },
          },
          required: [],
        },
      },
      {
        name: 'criar_saida',
        description: 'Lança uma despesa/saída financeira no sistema. Use quando o usuário quiser registrar gasto, despesa, conta a pagar, compra ou saída.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            description: { type: SchemaType.STRING, description: 'Descrição da despesa' },
            amount: { type: SchemaType.NUMBER, description: 'Valor em reais (número, sem R$)' },
            category: { type: SchemaType.STRING, description: 'Categoria da despesa (ex: combustível, material, alimentação, salário, aluguel, manutenção, outros)' },
            due_date: { type: SchemaType.STRING, description: 'Data de vencimento no formato YYYY-MM-DD' },
            type: {
              type: SchemaType.STRING,
              description: 'Tipo: "fixo" (recorrente, como aluguel) ou "variavel" (pontual, como combustível)',
            },
            notes: { type: SchemaType.STRING, description: 'Observações adicionais' },
          },
          required: ['description', 'amount', 'category', 'due_date', 'type'],
        },
      },
      {
        name: 'resumo_financeiro',
        description: 'Retorna resumo financeiro com receitas, despesas e chamados. Use quando o usuário perguntar sobre finanças, receitas, quanto ganhou, relatório ou desempenho.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            periodo: {
              type: SchemaType.STRING,
              description: 'Período: "hoje", "semana" (últimos 7 dias), "mes" (mês atual), "mes_passado"',
            },
          },
          required: ['periodo'],
        },
      },
      {
        name: 'listar_a_receber',
        description: 'Lista todos os valores pendentes de recebimento (clientes que ainda não pagaram). Use quando o usuário perguntar sobre a receber, inadimplência ou pagamentos pendentes.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'listar_saidas_pendentes',
        description: 'Lista despesas/contas a pagar que estão pendentes. Use quando o usuário perguntar sobre contas a pagar, despesas pendentes ou o que falta pagar.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {},
          required: [],
        },
      },
      {
        name: 'buscar_cliente',
        description: 'Busca clientes pelo nome. Use quando o usuário quiser encontrar um cliente específico.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            nome: { type: SchemaType.STRING, description: 'Nome do cliente para buscar' },
          },
          required: ['nome'],
        },
      },
    ],
  },
]

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<unknown> {
  const today = localToday()

  if (name === 'criar_chamado') {
    const { data, error } = await supabase
      .from('calls')
      .insert({
        tenant_id: tenantId,
        contact_name: args.contact_name,
        service_category: args.service_category,
        status: args.status,
        date: today,
        scheduled_date: args.scheduled_date ?? null,
        scheduled_time: args.scheduled_time ?? null,
        notes: args.notes ?? null,
        driver: args.driver ?? null,
        call_address: args.call_address ?? null,
        call_neighborhood: args.call_neighborhood ?? null,
        call_city: args.call_city ?? null,
        contact_phone: args.contact_phone ?? null,
        solicitante: args.solicitante ?? null,
        origin: 'chat_ia',
      })
      .select('id, call_number')
      .single()
    if (error) return { erro: error.message }
    return { sucesso: true, chamado_numero: data.call_number, id: data.id }
  }

  if (name === 'listar_chamados') {
    const limit = Math.min(Number(args.limit ?? 5), 20)
    let query = supabase
      .from('calls')
      .select('id, call_number, contact_name, service_category, status, date, scheduled_date, scheduled_time, driver')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (args.status) query = query.eq('status', args.status as string)
    const { data, error } = await query
    if (error) return { erro: error.message }
    return data
  }

  if (name === 'criar_saida') {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        tenant_id: tenantId,
        description: args.description,
        amount: args.amount,
        category: args.category,
        due_date: args.due_date,
        type: args.type,
        status: 'pendente',
        notes: args.notes ?? null,
      })
      .select('id, description, amount')
      .single()
    if (error) return { erro: error.message }
    return { sucesso: true, id: data.id, description: data.description, amount: data.amount }
  }

  if (name === 'resumo_financeiro') {
    let startDate = today
    let endDate = today

    const p = args.periodo as string
    if (p === 'semana') {
      startDate = addDays(today, -7)
    } else if (p === 'mes') {
      const d = new Date()
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    } else if (p === 'mes_passado') {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      endDate = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    }

    const [callsRes, ordersRes, expensesRes] = await Promise.all([
      supabase.from('calls').select('status').gte('date', startDate).lte('date', endDate),
      supabase.from('service_orders').select('total_value, payment_status, remaining_amount').gte('date', startDate).lte('date', endDate),
      supabase.from('expenses').select('amount, status').gte('due_date', startDate).lte('due_date', endDate),
    ])

    const calls = callsRes.data ?? []
    const orders = ordersRes.data ?? []
    const expenses = expensesRes.data ?? []

    const receita_bruta = orders.reduce((s, o) => s + (o.total_value || 0), 0)
    const total_despesas = expenses.reduce((s, e) => s + (e.amount || 0), 0)
    const a_receber = orders.filter(o => ['pendente', 'pago_parcial'].includes(o.payment_status)).reduce((s, o) => s + (o.remaining_amount || o.total_value || 0), 0)

    return {
      periodo: `${startDate} a ${endDate}`,
      total_chamados: calls.length,
      aprovados: calls.filter(c => c.status === 'aprovado').length,
      agendados: calls.filter(c => c.status === 'agendado').length,
      nao_aprovados: calls.filter(c => c.status === 'nao_aprovou').length,
      receita_bruta,
      total_despesas,
      receita_liquida: receita_bruta - total_despesas,
      a_receber,
    }
  }

  if (name === 'listar_a_receber') {
    const { data, error } = await supabase
      .from('service_orders')
      .select('id, date, total_value, remaining_amount, remaining_due_date, payment_status, client:clients(name), call:calls(contact_name)')
      .in('payment_status', ['pendente', 'pago_parcial'])
      .order('remaining_due_date', { ascending: true })
      .limit(10)
    if (error) return { erro: error.message }
    return data
  }

  if (name === 'listar_saidas_pendentes') {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount, category, due_date, type')
      .eq('status', 'pendente')
      .order('due_date', { ascending: true })
      .limit(10)
    if (error) return { erro: error.message }
    return data
  }

  if (name === 'buscar_cliente') {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone, city, address')
      .ilike('name', `%${args.nome}%`)
      .limit(5)
    if (error) return { erro: error.message }
    return data
  }

  return { erro: 'Função desconhecida' }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const tenantId = profile.tenant_id
    const today = localToday()

    const systemPrompt = `Você é o Assistente IA do Connect Financeiro, um sistema de gestão para empresas de desentupimento.
Você ajuda a registrar chamados, lançar saídas, consultar finanças e ver relatórios usando as funções disponíveis.

Data de hoje: ${today}
Quando o usuário disser "amanhã", use a data: ${addDays(today, 1)}
Quando o usuário disser "depois de amanhã", use: ${addDays(today, 2)}
Quando disser "semana que vem segunda", calcule corretamente a partir de hoje.

Categorias de serviço válidas: Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros
Sub-opções de Desentupimento: Ralo, Pia, Vaso, Esgoto, Coluna
Sub-opções de Limpeza: Caixa de Gordura, Fossa

Status de chamado:
- "imediato": atendimento sendo realizado agora
- "agendado": com data e hora marcadas para o futuro
- "aprovado": cliente aprovou, aguardando OS

Regras importantes:
1. Sempre use as funções disponíveis para executar ações — não invente dados
2. Após executar uma função, confirme o que foi feito de forma clara e direta em português
3. Para chamados agendados, sempre pergunte a data e hora se não foram informadas
4. Formate valores monetários como R$ X.XXX,XX
5. Seja conciso e direto nas respostas
6. Se faltar informação essencial, pergunte apenas o que é necessário`

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: TOOLS,
      systemInstruction: systemPrompt,
    })

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(message)
    const response = result.response

    const functionCalls = response.functionCalls()
    if (functionCalls && functionCalls.length > 0) {
      const fc = functionCalls[0]
      const toolResult = await executeTool(fc.name, fc.args as Record<string, unknown>, supabase, tenantId)

      const result2 = await chat.sendMessage([
        {
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        },
      ])

      return NextResponse.json({ reply: result2.response.text(), functionCalled: fc.name })
    }

    return NextResponse.json({ reply: response.text() })
  } catch (err: unknown) {
    console.error('Chat error:', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
