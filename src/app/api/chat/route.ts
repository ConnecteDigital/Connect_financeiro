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
    : 'Ex: indicacao, terceirizado'

  return [
    {
      type: 'function',
      function: {
        name: 'criar_chamado',
        description: 'Cria um chamado. SÓ chame esta função quando JÁ TIVER coletado origem, nome, serviço e status em turnos anteriores. NUNCA chame junto com perguntas.',
        parameters: {
          type: 'object',
          properties: {
            contact_name: { type: 'string', description: 'Nome do cliente' },
            service_category: { type: 'string', description: 'Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros' },
            status: { type: 'string', description: '"imediato", "agendado" ou "aprovado"' },
            origin: { type: 'string', description: `Origem obrigatória. ${originDesc}` },
            scheduled_date: { type: 'string', description: 'Data YYYY-MM-DD (quando agendado)' },
            scheduled_time: { type: 'string', description: 'Hora HH:MM (quando agendado)' },
            notes: { type: 'string', description: 'Observações' },
            driver: { type: 'string', description: 'Técnico responsável' },
            call_address: { type: 'string', description: 'Endereço' },
            call_neighborhood: { type: 'string', description: 'Bairro' },
            call_city: { type: 'string', description: 'Cidade' },
            contact_phone: { type: 'string', description: 'Telefone (opcional)' },
            contact_cpf: { type: 'string', description: 'CPF ou CNPJ (opcional)' },
            solicitante: { type: 'string', description: 'Quem ligou/solicitou' },
          },
          required: ['contact_name', 'service_category', 'status', 'origin'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'buscar_chamados',
        description: 'Busca chamados por qualquer critério: nome, número do chamado (CH-00049), número da OS, CPF, CNPJ, endereço, cidade, bairro, serviço.',
        parameters: {
          type: 'object',
          properties: {
            texto: { type: 'string', description: 'Texto livre para buscar (nome, endereço, número, CPF, etc.)' },
            status: { type: 'string', description: 'Filtrar por status: imediato, agendado, aprovado, nao_aprovou, cancelado, nao_quis_visita' },
          },
          required: ['texto'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'deletar_chamado',
        description: 'Deleta um chamado pelo ID. SEMPRE use buscar_chamados antes para confirmar o ID correto com o usuário.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID do chamado a deletar (UUID)' },
            call_number: { type: 'string', description: 'Número do chamado para confirmar (ex: CH-00049)' },
          },
          required: ['id', 'call_number'],
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
            description: { type: 'string', description: 'Descrição' },
            amount: { type: 'number', description: 'Valor em reais' },
            category: { type: 'string', description: 'combustível, material, alimentação, salário, aluguel, manutenção, outros' },
            due_date: { type: 'string', description: 'Vencimento YYYY-MM-DD' },
            type: { type: 'string', description: '"fixo" ou "variavel"' },
            notes: { type: 'string', description: 'Observações' },
          },
          required: ['description', 'amount', 'category', 'due_date', 'type'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resumo_financeiro',
        description: 'Resumo financeiro com receitas, despesas e chamados.',
        parameters: {
          type: 'object',
          properties: {
            periodo: { type: 'string', description: '"hoje", "semana", "mes" ou "mes_passado"' },
          },
          required: ['periodo'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'listar_a_receber',
        description: 'Lista valores pendentes de recebimento de clientes.',
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
        contact_cpf: args.contact_cpf ?? null,
        solicitante: args.solicitante ?? null,
      })
      .select('id, call_number')
      .single()
    if (error) return { result: { erro: error.message } }
    return { result: { sucesso: true, chamado_numero: data.call_number, id: data.id }, callId: data.id }
  }

  if (name === 'buscar_chamados') {
    const limit = 10
    const texto = String(args.texto ?? '').trim()

    // Search across multiple fields
    const queries = await Promise.all([
      // By contact name or call number or service
      supabase
        .from('calls')
        .select('id, call_number, contact_name, contact_phone, contact_cpf, service_category, status, date, scheduled_date, scheduled_time, call_address, call_city, origin, driver')
        .or(`contact_name.ilike.%${texto}%,call_number.ilike.%${texto}%,call_address.ilike.%${texto}%,call_city.ilike.%${texto}%,call_neighborhood.ilike.%${texto}%,contact_phone.ilike.%${texto}%,contact_cpf.ilike.%${texto}%`)
        .order('created_at', { ascending: false })
        .limit(limit),

      // By OS number from service_orders
      supabase
        .from('service_orders')
        .select('call_id, os_number')
        .ilike('os_number', `%${texto}%`)
        .limit(5),
    ])

    const directResults = queries[0].data ?? []
    const osResults = queries[1].data ?? []

    // Fetch calls for OS matches
    const osCallIds = osResults.map((o: { call_id: string }) => o.call_id).filter(Boolean)
    let osCallsData: typeof directResults = []
    if (osCallIds.length > 0) {
      const { data } = await supabase
        .from('calls')
        .select('id, call_number, contact_name, contact_phone, contact_cpf, service_category, status, date, scheduled_date, scheduled_time, call_address, call_city, origin, driver')
        .in('id', osCallIds)
      osCallsData = data ?? []
    }

    // Also filter by status if provided
    let results = [...directResults, ...osCallsData]
    // Deduplicate by id
    const seen = new Set<string>()
    results = results.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })

    if (args.status) results = results.filter(r => r.status === args.status)

    return { result: results.slice(0, limit) }
  }

  if (name === 'deletar_chamado') {
    const { error } = await supabase
      .from('calls')
      .delete()
      .eq('id', args.id as string)
    if (error) return { result: { erro: error.message } }
    return { result: { sucesso: true, mensagem: `Chamado ${args.call_number} deletado com sucesso.` } }
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
    const p = String(args.periodo ?? 'mes')
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
        cancelados: calls.filter(c => c.status === 'cancelado').length,
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
      .select('id, date, total_value, remaining_amount, remaining_due_date, payment_status, client:clients(name), call:calls(contact_name, call_number)')
      .in('payment_status', ['pendente', 'pago_parcial'])
      .order('remaining_due_date', { ascending: true })
      .limit(10)
    if (error) return { result: { erro: error.message } }
    return { result: data ?? [] }
  }

  if (name === 'listar_saidas_pendentes') {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount, category, due_date, type')
      .eq('status', 'pendente')
      .order('due_date', { ascending: true })
      .limit(10)
    if (error) return { result: { erro: error.message } }
    return { result: data ?? [] }
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

    const { data: profile } = await supabase
      .from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const tenantId = profile.tenant_id

    const { data: tenantData } = await supabase
      .from('tenants').select('call_origins').eq('id', tenantId).single()
    const origins: string[] = tenantData?.call_origins ?? []

    const today = localToday()
    const originsText = origins.length > 0
      ? origins.map(o => `${o} = ${ORIGIN_LABELS[o] ?? o}`).join(', ')
      : 'indicacao, terceirizado'

    const systemPrompt = `Você é o Assistente IA do Connect Financeiro, sistema de gestão para empresas de desentupimento.
Responda sempre em português brasileiro, de forma direta e concisa.

Data de hoje: ${today} | Amanhã: ${addDays(today, 1)} | Depois: ${addDays(today, 2)}
Origens do sistema: ${originsText}
Categorias: Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros

═══ REGRAS CRÍTICAS PARA CRIAR CHAMADO ═══

ANTES de chamar criar_chamado, você DEVE ter coletado EM TURNOS ANTERIORES:
  1. Nome do cliente ✓
  2. Serviço ✓
  3. Status (imediato/agendado/aprovado) ✓
  4. ORIGEM (obrigatória — pergunte se não informada)

OPCIONAIS — pergunte de forma simpática mas NÃO BLOQUEIE se o usuário não quiser:
  - Telefone: pergunte "Deseja adicionar telefone?" mas aceite "não"
  - CPF/CNPJ: pergunte "Deseja adicionar CPF ou CNPJ?" mas aceite "não"

PROIBIDO:
  ✗ Chamar criar_chamado e fazer perguntas no MESMO turno
  ✗ Criar o chamado sem ter a origem
  ✗ Criar o chamado sem confirmar que o usuário não quer adicionar mais nada

FLUXO CORRETO:
  Turno 1: usuário dá as infos → você verifica o que falta → faz TODAS as perguntas faltantes em UMA mensagem
  Turno 2: usuário responde → se ainda falta algo, pergunta → senão CRIA o chamado
  Turno 3: confirma criação + mostra número

═══ OUTRAS REGRAS ═══
- Para DELETAR: sempre use buscar_chamados primeiro, mostre o chamado encontrado e confirme com o usuário antes de deletar
- Para BUSCA: use buscar_chamados com qualquer texto (nome, endereço, OS, número, CPF)
- Formate valores como R$ X.XXX,XX
- Após criar chamado, informe o número gerado (ex: CH-00051)`

    const TOOLS = buildTools(origins)

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message },
    ]

    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
    })

    const assistantMessage = response.choices[0].message
    const toolCalls = assistantMessage.tool_calls

    if (toolCalls && toolCalls.length > 0) {
      const tc = toolCalls[0]
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments) as Record<string, unknown>
      } catch {
        return NextResponse.json({ reply: 'Ocorreu um erro ao processar o comando. Tente novamente.' })
      }

      const { result: toolResult, callId } = await executeTool(tc.function.name, args, supabase, tenantId)

      const messagesWithTool: Groq.Chat.ChatCompletionMessageParam[] = [
        ...messages,
        assistantMessage,
        { role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) },
      ]

      const response2 = await groq.chat.completions.create({
        model: MODEL,
        messages: messagesWithTool,
        temperature: 0.2,
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
