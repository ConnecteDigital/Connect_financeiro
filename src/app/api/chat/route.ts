import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GEMINI_API_KEY ?? '' })
const MODEL = 'llama-3.3-70b-versatile'

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ORIGIN_LABELS: Record<string, string> = {
  site_lider: 'Site Líder',
  site_poa: 'Site POA',
  site_millenium: 'Site Millenium',
  site_praja: 'Site Pra Já',
  indicacao: 'Indicação',
  terceirizado: 'Terceirizado',
}

function buildTools(origins: string[]): Groq.Chat.ChatCompletionTool[] {
  const originDesc = origins.length > 0
    ? `Valores válidos: ${origins.map(o => `"${o}" (${ORIGIN_LABELS[o] ?? o})`).join(', ')}`
    : 'Ex: indicacao, site_lider, terceirizado'

  return [
    {
      type: 'function',
      function: {
        name: 'criar_chamado',
        description: 'Cria um novo chamado/atendimento no sistema. SEMPRE pergunte a origem e o telefone antes de criar, se não foram informados.',
        parameters: {
          type: 'object',
          properties: {
            contact_name: { type: 'string', description: 'Nome do cliente ou contato' },
            service_category: { type: 'string', description: 'Categoria: Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros' },
            status: { type: 'string', description: '"imediato" (atendimento agora), "agendado" (com data/hora), "aprovado" (aguardando OS)' },
            origin: { type: 'string', description: `Origem do chamado. ${originDesc}` },
            scheduled_date: { type: 'string', description: 'Data YYYY-MM-DD. Obrigatório quando status=agendado.' },
            scheduled_time: { type: 'string', description: 'Hora HH:MM. Usar quando status=agendado.' },
            notes: { type: 'string', description: 'Observações ou detalhes adicionais' },
            driver: { type: 'string', description: 'Nome do técnico responsável' },
            call_address: { type: 'string', description: 'Endereço do atendimento' },
            call_neighborhood: { type: 'string', description: 'Bairro' },
            call_city: { type: 'string', description: 'Cidade' },
            contact_phone: { type: 'string', description: 'Telefone do cliente' },
            solicitante: { type: 'string', description: 'Nome de quem ligou/solicitou' },
          },
          required: ['contact_name', 'service_category', 'status', 'origin'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_chamados',
        description: 'Lista chamados recentes. Use quando o usuário perguntar sobre chamados ou atendimentos.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filtrar: imediato, agendado, aprovado, nao_aprovou, cancelado, nao_quis_visita. Omitir para todos.' },
            limit: { type: 'number', description: 'Quantidade (padrão 5, máximo 20)' },
          },
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'criar_saida',
        description: 'Lança uma despesa/saída financeira.',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Descrição da despesa' },
            amount: { type: 'number', description: 'Valor em reais (número sem R$)' },
            category: { type: 'string', description: 'Categoria (combustível, material, alimentação, salário, aluguel, manutenção, outros)' },
            due_date: { type: 'string', description: 'Data de vencimento YYYY-MM-DD' },
            type: { type: 'string', description: '"fixo" (recorrente) ou "variavel" (pontual)' },
            notes: { type: 'string', description: 'Observações adicionais' },
          },
          required: ['description', 'amount', 'category', 'due_date', 'type'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resumo_financeiro',
        description: 'Retorna resumo financeiro. Use quando o usuário perguntar sobre receitas, despesas, desempenho ou relatório.',
        parameters: {
          type: 'object',
          properties: {
            periodo: { type: 'string', description: '"hoje", "semana" (7 dias), "mes" (mês atual), "mes_passado"' },
          },
          required: ['periodo'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_a_receber',
        description: 'Lista valores pendentes de recebimento.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_saidas_pendentes',
        description: 'Lista contas a pagar pendentes.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function',
      function: {
        name: 'buscar_cliente',
        description: 'Busca clientes pelo nome.',
        parameters: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome para buscar' },
          },
          required: ['nome'],
        },
      },
    },
  ]
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
): Promise<{ result: unknown; callId?: string }> {
  const today = localToday()

  if (name === 'criar_chamado') {
    const { data, error } = await supabase
      .from('calls')
      .insert({
        tenant_id: tenantId,
        contact_name: args.contact_name,
        service_category: args.service_category,
        status: args.status,
        origin: args.origin ?? null,
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
      })
      .select('id, call_number')
      .single()
    if (error) return { result: { erro: error.message } }
    return {
      result: { sucesso: true, chamado_numero: data.call_number, id: data.id },
      callId: data.id,
    }
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
    if (error) return { result: { erro: error.message } }
    return { result: data }
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
    if (error) return { result: { erro: error.message } }
    return { result: { sucesso: true, id: data.id, description: data.description, amount: data.amount } }
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
    const a_receber = orders
      .filter(o => ['pendente', 'pago_parcial'].includes(o.payment_status))
      .reduce((s, o) => s + (o.remaining_amount || o.total_value || 0), 0)
    return {
      result: {
        periodo: `${startDate} a ${endDate}`,
        total_chamados: calls.length,
        aprovados: calls.filter(c => c.status === 'aprovado').length,
        agendados: calls.filter(c => c.status === 'agendado').length,
        nao_aprovados: calls.filter(c => c.status === 'nao_aprovou').length,
        receita_bruta,
        total_despesas,
        receita_liquida: receita_bruta - total_despesas,
        a_receber,
      },
    }
  }

  if (name === 'listar_a_receber') {
    const { data, error } = await supabase
      .from('service_orders')
      .select('id, date, total_value, remaining_amount, remaining_due_date, payment_status, client:clients(name), call:calls(contact_name)')
      .in('payment_status', ['pendente', 'pago_parcial'])
      .order('remaining_due_date', { ascending: true })
      .limit(10)
    if (error) return { result: { erro: error.message } }
    return { result: data }
  }

  if (name === 'listar_saidas_pendentes') {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount, category, due_date, type')
      .eq('status', 'pendente')
      .order('due_date', { ascending: true })
      .limit(10)
    if (error) return { result: { erro: error.message } }
    return { result: data }
  }

  if (name === 'buscar_cliente') {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, phone, city, address')
      .ilike('name', `%${args.nome}%`)
      .limit(5)
    if (error) return { result: { erro: error.message } }
    return { result: data }
  }

  return { result: { erro: 'Função desconhecida' } }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const tenantId = profile.tenant_id

    // Fetch tenant origins for the tools
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('call_origins')
      .eq('id', tenantId)
      .single()
    const origins: string[] = tenantData?.call_origins ?? []

    const today = localToday()

    const originsText = origins.length > 0
      ? `Origens configuradas no sistema: ${origins.map(o => `${o} (${ORIGIN_LABELS[o] ?? o})`).join(', ')}`
      : 'Origens comuns: indicacao, terceirizado'

    const systemPrompt = `Você é o Assistente IA do Connect Financeiro, sistema de gestão para empresas de desentupimento.
Sempre responda em português brasileiro, de forma clara e direta.

Data de hoje: ${today}
Amanhã: ${addDays(today, 1)} | Depois de amanhã: ${addDays(today, 2)}

${originsText}

Categorias de serviço: Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros
Status: "imediato" (agora), "agendado" (com data/hora), "aprovado" (aguardando OS)

REGRAS IMPORTANTES para criar chamado:
1. Se o usuário não informar a ORIGEM, pergunte: "Esse chamado veio de onde? (${origins.slice(0, 3).join(', ')}...)"
2. Se o usuário não informar o TELEFONE, pergunte antes de criar
3. Só crie o chamado depois de ter origem e telefone (ou o usuário disser que não tem)
4. Após criar, confirme com o número do chamado gerado

Outras regras:
- Use as funções para executar ações — nunca invente dados
- Formate valores como R$ X.XXX,XX
- Se faltar info essencial, pergunte antes de executar`

    const TOOLS = buildTools(origins)

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.3,
    })

    const assistantMessage = response.choices[0].message
    const toolCalls = assistantMessage.tool_calls

    if (toolCalls && toolCalls.length > 0) {
      const tc = toolCalls[0]
      const args = JSON.parse(tc.function.arguments) as Record<string, unknown>
      const { result: toolResult, callId } = await executeTool(tc.function.name, args, supabase, tenantId)

      const messagesWithTool: Groq.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        assistantMessage,
        {
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        },
      ]

      const response2 = await groq.chat.completions.create({
        model: MODEL,
        messages: messagesWithTool,
        temperature: 0.3,
      })

      const reply = response2.choices[0].message.content ?? 'Feito!'
      return NextResponse.json({ reply, functionCalled: tc.function.name, callId })
    }

    return NextResponse.json({ reply: assistantMessage.content ?? 'Como posso ajudar?' })
  } catch (err: unknown) {
    console.error('Chat error:', err)
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
