import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GEMINI_API_KEY ?? '' })
const MODEL = 'llama-3.1-8b-instant'
const FALLBACK_MODEL = 'llama-3.3-70b-versatile'

async function groqCall(params: Omit<ChatCompletionCreateParamsNonStreaming, 'stream'>): Promise<Groq.Chat.ChatCompletion> {
  const full: ChatCompletionCreateParamsNonStreaming = { ...params, stream: false }
  try {
    return await groq.chat.completions.create(full)
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 429) {
      return await groq.chat.completions.create({ ...full, model: FALLBACK_MODEL })
    }
    throw err
  }
}

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
  const originKeys = origins.length > 0
    ? `Chaves válidas (use EXATAMENTE uma delas): ${origins.map(o => `"${o}"`).join(', ')}`
    : 'Ex: "indicacao", "terceirizado"'

  return [
    {
      type: 'function',
      function: {
        name: 'criar_chamado',
        description: 'Cria um chamado (agendado ou aprovado). Para aprovado, também cria a Ordem de Serviço com valor e forma de pagamento.',
        parameters: {
          type: 'object',
          properties: {
            contact_name: { type: 'string', description: 'Nome do cliente (nunca use placeholder)' },
            service_category: { type: 'string', description: 'Desentupimento, Hidrojateamento, Limpeza, Sucção, Aplicação de CO2, Reclamação, Outros' },
            status: { type: 'string', description: '"agendado" ou "aprovado"' },
            origin: { type: 'string', description: `Chave da origem confirmada pelo usuário. ${originKeys}` },
            scheduled_date: { type: 'string', description: 'Data YYYY-MM-DD (obrigatório para agendado)' },
            scheduled_time: { type: 'string', description: 'Hora HH:MM (obrigatório para agendado)' },
            driver: { type: 'string', description: 'Técnico/motorista responsável' },
            solicitante: { type: 'string', description: 'Quem ligou/solicitou' },
            contact_phone: { type: 'string', description: 'Telefone' },
            contact_cpf: { type: 'string', description: 'CPF ou CNPJ' },
            call_address: { type: 'string', description: 'Endereço' },
            call_neighborhood: { type: 'string', description: 'Bairro' },
            call_city: { type: 'string', description: 'Cidade' },
            notes: { type: 'string', description: 'Observações do chamado' },
            // Campos extras para status "aprovado" — geram a OS
            total_value: { type: 'number', description: 'Valor total do serviço em R$ (aprovado)' },
            payment_method: { type: 'string', description: 'Forma de pagamento: dinheiro, cartao, pix, boleto (aprovado)' },
            payment_status: { type: 'string', description: 'Status de pagamento: pago, pago_parcial, pendente (aprovado, padrão: pendente)' },
            execution_type: { type: 'string', description: 'Tipo de execução: proprio, terceirizado, parceiro (aprovado, padrão: proprio)' },
            vehicle: { type: 'string', description: 'Veículo utilizado (aprovado, opcional)' },
            os_notes: { type: 'string', description: 'Observações da OS (aprovado, opcional)' },
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

function originAppearsInUserMessages(origin: string, history: { role: string; content: string }[]): boolean {
  const userMessages = history.filter(m => m.role === 'user').map(m => (m.content ?? '').toLowerCase())
  const originLower = origin.toLowerCase()
  const label = (ORIGIN_LABELS[origin] ?? origin).toLowerCase()
  return userMessages.some(msg => msg.includes(originLower) || msg.includes(label))
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  validOrigins: string[],
  conversationHistory: { role: string; content: string }[],
): Promise<{ result: unknown; callId?: string }> {
  const today = localToday()

  if (name === 'criar_chamado') {
    // Block placeholder names
    const nameLower = String(args.contact_name ?? '').toLowerCase().trim()
    if (!args.contact_name || nameLower === 'cliente' || nameLower === 'não informado' || nameLower === '') {
      return { result: { erro: 'NOME_OBRIGATORIO', instrucao: 'O nome do cliente não foi informado pelo usuário. Pergunte o nome do cliente antes de criar o chamado.' } }
    }
    if (!args.origin) {
      return { result: { erro: 'ORIGEM_OBRIGATORIA', instrucao: 'A origem não foi informada. Pergunte ao usuário: de onde veio esse chamado?' } }
    }
    // Origin must appear in conversation history (user must have mentioned it)
    if (validOrigins.length > 0 && !originAppearsInUserMessages(args.origin as string, conversationHistory)) {
      return { result: { erro: 'ORIGEM_NAO_CONFIRMADA', instrucao: `A origem "${args.origin}" não foi confirmada pelo usuário. Pergunte: "Esse chamado veio de onde? (${validOrigins.map(o => ORIGIN_LABELS[o] ?? o).join(' / ')})"` } }
    }
    // Fuzzy-match origin: exact key → case-insensitive key → label match
    if (validOrigins.length > 0 && !validOrigins.includes(args.origin as string)) {
      const lowerInput = (args.origin as string).toLowerCase().trim()
      const matched = validOrigins.find(o =>
        o.toLowerCase() === lowerInput ||
        (ORIGIN_LABELS[o] ?? o).toLowerCase() === lowerInput
      )
      if (matched) {
        args.origin = matched // fix key case
      } else {
        const list = validOrigins.map(o => `"${o}"`).join(', ')
        return { result: { erro: 'ORIGEM_INVALIDA', instrucao: `A origem "${args.origin}" não existe. Chaves válidas: ${list}. Pergunte ao usuário qual origem e use a chave correta.` } }
      }
    }
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

    // For "aprovado" status, also create the service order
    if (args.status === 'aprovado' && args.total_value != null) {
      const totalValue = Number(args.total_value) || 0
      await supabase.from('service_orders').insert({
        tenant_id: tenantId,
        call_id: data.id,
        date: today,
        total_value: totalValue,
        remaining_amount: totalValue,
        payment_method: args.payment_method ?? null,
        payment_status: (args.payment_status as string) ?? 'pendente',
        execution_type: (args.execution_type as string) ?? 'proprio',
        driver: args.driver ?? null,
        vehicle: args.vehicle ?? null,
        notes: args.os_notes ?? args.notes ?? null,
      })
    }

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
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(String(args.id ?? ''))) {
      return { result: { erro: 'ID_INVALIDO', instrucao: 'Você precisa chamar buscar_chamados primeiro para obter o UUID real do chamado. NUNCA invente ou adivinhe o ID.' } }
    }
    // Verify the call belongs to this tenant before deleting
    const { data: callCheck } = await supabase
      .from('calls')
      .select('id, call_number')
      .eq('id', args.id as string)
      .single()
    if (!callCheck) {
      return { result: { erro: 'CHAMADO_NAO_ENCONTRADO', instrucao: `Chamado com ID ${args.id} não foi encontrado. Use buscar_chamados para encontrar o ID correto.` } }
    }
    const { error } = await supabase
      .from('calls')
      .delete()
      .eq('id', args.id as string)
    if (error) return { result: { erro: error.message } }
    // Confirm deletion
    const { data: stillExists } = await supabase
      .from('calls')
      .select('id')
      .eq('id', args.id as string)
      .maybeSingle()
    if (stillExists) return { result: { erro: 'FALHA_DELECAO', instrucao: 'O chamado ainda existe após tentativa de deleção. Pode não ter permissão.' } }
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

function detectQuickReplies(reply: string, origins: string[]): string[] | undefined {
  const lower = reply.toLowerCase()

  // Pergunta ESPECÍFICA sobre origem — frases diretas, não palavras soltas
  const isAskingOrigin = origins.length > 0 && (
    lower.includes('origem do chamado') ||
    lower.includes('veio de onde') ||
    lower.includes('qual a origem') ||
    lower.includes('informar a origem') ||
    lower.includes('me informar a origem') ||
    lower.includes('de onde veio')
  )
  if (isAskingOrigin) return origins.map(o => ORIGIN_LABELS[o] ?? o)

  // Pergunta sobre telefone
  if ((lower.includes('telefone') || lower.includes('celular')) &&
      (lower.includes('deseja') || lower.includes('quer') || lower.includes('adicionar') || lower.includes('para contato'))) {
    return ['Sim, tenho telefone', 'Não, obrigado']
  }

  // Pergunta sobre CPF/CNPJ
  if ((lower.includes('cpf') || lower.includes('cnpj')) &&
      (lower.includes('deseja') || lower.includes('quer') || lower.includes('adicionar'))) {
    return ['Sim, tenho CPF/CNPJ', 'Não, obrigado']
  }

  // Confirmação de delete
  if ((lower.includes('confirma') || lower.includes('tem certeza') || lower.includes('deseja realmente')) &&
      (lower.includes('delet') || lower.includes('exclu') || lower.includes('apag') || lower.includes('remov'))) {
    return ['Sim, deletar', 'Não, cancelar']
  }

  return undefined
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
    const originsLabels = origins.length > 0
      ? origins.map(o => ORIGIN_LABELS[o] ?? o).join(' / ')
      : 'Indicação / Terceirizado'

    const systemPrompt = `Você é o Connect IA, assistente do Connect Financeiro (empresa de desentupimento). Responda em pt-BR, direto e conciso.
Hoje: ${today} | Amanhã: ${addDays(today, 1)}
Origens disponíveis: ${originsText}
Mapeamento de serviços (use SEMPRE o nome exato, nunca coloque em notes):
- Desentupimento = qualquer desentupimento
- Hidrojateamento = hidrojato/hidrojateamento
- Limpeza = limpeza de fossa / caixa de gordura
- Sucção = sucção / sugar / esvaziar fossa
- Aplicação de CO2 = co2
- Reclamação = reclamação
- Outros = qualquer outro

═══════════════════════════════
CRIAR CHAMADO — FLUXO INTELIGENTE
═══════════════════════════════

── CHAMADO AGENDADO ──
Obrigatórios: nome do cliente | origem | tipo de serviço | data e hora
Opcionais: técnico | solicitante | telefone | CPF/CNPJ | endereço | observações

── CHAMADO APROVADO ──
Obrigatórios: nome do cliente | origem | tipo de serviço | valor do serviço (R$) | forma de pagamento (dinheiro/cartão/PIX/boleto)
Opcionais: técnico/motorista | veículo | solicitante | telefone | CPF/CNPJ | endereço | tipo de execução (próprio/terceirizado/parceiro) | status de pagamento (pago/pago_parcial/pendente) | observações

REGRA 1 — Analise a mensagem e identifique quais obrigatórios JÁ foram informados.
REGRA 2 — Se faltar algum obrigatório, pergunte TODOS os que faltam em UMA só mensagem.
  Exemplo agendado: "Para criar o chamado, ainda preciso de: nome do cliente e origem."
  Exemplo aprovado: "Para criar o chamado aprovado, ainda preciso de: valor do serviço e forma de pagamento."
REGRA 3 — Com TODOS os obrigatórios em mãos, pergunte em uma mensagem: "Deseja adicionar informações opcionais? (técnico, telefone, endereço, etc.)"
REGRA 4 — Após resposta sobre opcionais (sim ou não), CRIE o chamado com criar_chamado.

PROIBIDO:
- Criar chamado sem todos os obrigatórios confirmados pelo usuário
- Inventar ou assumir origem sem o usuário ter dito explicitamente
- Preencher contact_name com "Cliente" ou qualquer placeholder
- Perguntar campos um por um quando vários estão faltando

═══════════════════════════════
OUTRAS AÇÕES
═══════════════════════════════
DELETAR: use buscar_chamados primeiro → mostre resultado → confirme → delete.
BUSCA: buscar_chamados aceita nome, endereço, número (CH-XXXXX), CPF, número de OS.
Formate valores: R$ X.XXX,XX
Após criar chamado: informe o número (ex: CH-00051)`

    const TOOLS = buildTools(origins)

    // Limit history to last 16 messages (8 turns) — chamado flow needs more context
    const trimmedHistory = (Array.isArray(history) ? history : []).slice(-16)

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message },
    ]

    const response = await groqCall({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.2,
    })

    // Loop de tool calls: permite múltiplas ações em sequência (ex: deletar 2 chamados)
    let currentMessages = [...messages]
    let assistantMessage = response.choices[0].message
    let lastFunctionCalled = ''
    let lastCallId: string | undefined
    const MAX_TOOL_ROUNDS = 6

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const toolCalls = assistantMessage.tool_calls
      if (!toolCalls || toolCalls.length === 0) break

      const tc = toolCalls[0]
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments) as Record<string, unknown>
      } catch {
        break
      }

      const { result: toolResult, callId } = await executeTool(tc.function.name, args, supabase, tenantId, origins, trimmedHistory as { role: string; content: string }[])
      lastFunctionCalled = tc.function.name
      if (callId) lastCallId = callId

      currentMessages = [
        ...currentMessages,
        assistantMessage,
        { role: 'tool' as const, tool_call_id: tc.id, content: JSON.stringify(toolResult) },
      ]

      const nextResponse = await groqCall({
        model: MODEL,
        messages: currentMessages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
      })

      assistantMessage = nextResponse.choices[0].message
    }

    const reply = assistantMessage.content ?? 'Feito!'
    const quickReplies = detectQuickReplies(reply, origins)
    return NextResponse.json({
      reply,
      functionCalled: lastFunctionCalled || undefined,
      callId: lastCallId,
      quickReplies,
    })
  } catch (err: unknown) {
    console.error('Chat error:', err)
    const status = (err as { status?: number })?.status
    if (status === 429) {
      return NextResponse.json({
        error: 'Limite de uso atingido. Aguarde alguns minutos e tente novamente.',
      }, { status: 429 })
    }
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
