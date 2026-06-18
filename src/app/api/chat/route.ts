import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GEMINI_API_KEY ?? '' })
const MODEL = 'llama-3.1-8b-instant'
const FALLBACK_MODEL = 'llama-3.3-70b-versatile'

type GMsg = Groq.Chat.ChatCompletionMessageParam

const ORIGIN_LABELS: Record<string, string> = {
  site_lider: 'Site Líder',
  site_poa: 'Site POA',
  site_millenium: 'Site Millenium',
  site_praja: 'Site Pra Já',
  indicacao: 'Indicação',
  terceirizado: 'Terceirizado',
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function groqCall(msgs: GMsg[], tools: Groq.Chat.ChatCompletionTool[]): Promise<Groq.Chat.ChatCompletion> {
  const params = { model: MODEL, messages: msgs, tools, tool_choice: 'auto' as const, temperature: 0.1, stream: false as const }
  try {
    return await groq.chat.completions.create(params)
  } catch (err: unknown) {
    if ((err as { status?: number })?.status === 429) {
      return await groq.chat.completions.create({ ...params, model: FALLBACK_MODEL })
    }
    throw err
  }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

function buildTools(origins: string[]): Groq.Chat.ChatCompletionTool[] {
  const originKeys = origins.length
    ? `Use EXATAMENTE uma destas chaves: ${origins.map(o => `"${o}"`).join(', ')}`
    : 'Ex: "indicacao"'

  return [
    {
      type: 'function',
      function: {
        name: 'criar_chamado',
        description: 'Cria chamado no sistema. Chame SOMENTE quando tiver: contact_name (nome real do cliente), service_category, status, origin (chave confirmada pelo usuário).',
        parameters: {
          type: 'object',
          properties: {
            contact_name:      { type: 'string', description: 'Nome real do cliente (nunca use placeholder)' },
            service_category:  { type: 'string', description: 'Desentupimento | Hidrojateamento | Limpeza | Sucção | Aplicação de CO2 | Reclamação | Outros' },
            status:            { type: 'string', description: '"agendado" ou "aprovado"' },
            origin:            { type: 'string', description: `Chave confirmada pelo usuário. ${originKeys}` },
            scheduled_date:    { type: 'string', description: 'YYYY-MM-DD (obrigatório se agendado)' },
            scheduled_time:    { type: 'string', description: 'HH:MM (obrigatório se agendado)' },
            call_address:      { type: 'string' },
            call_neighborhood: { type: 'string' },
            call_city:         { type: 'string' },
            contact_phone:     { type: 'string' },
            contact_cpf:       { type: 'string' },
            driver:            { type: 'string', description: 'Técnico/motorista' },
            solicitante:       { type: 'string' },
            notes:             { type: 'string' },
            // Aprovado extras → cria OS automaticamente
            total_value:    { type: 'number', description: 'Valor R$ (aprovado)' },
            payment_method: { type: 'string', description: 'dinheiro | cartao | pix | boleto (aprovado)' },
            payment_status: { type: 'string', description: 'pago | pago_parcial | pendente (aprovado)' },
            execution_type: { type: 'string', description: 'proprio | terceirizado | parceiro (aprovado)' },
            vehicle:        { type: 'string' },
            os_notes:       { type: 'string' },
          },
          required: ['contact_name', 'service_category', 'status', 'origin'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'buscar_chamados',
        description: 'Busca chamados por nome, número (CH-XXXXX), endereço, CPF, número de OS.',
        parameters: {
          type: 'object',
          properties: {
            texto:  { type: 'string' },
            status: { type: 'string', description: 'imediato | agendado | aprovado | nao_aprovou | cancelado' },
          },
          required: ['texto'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'deletar_chamado',
        description: 'Deleta chamado. SEMPRE use buscar_chamados antes para confirmar o ID.',
        parameters: {
          type: 'object',
          properties: {
            id:          { type: 'string', description: 'UUID do chamado' },
            call_number: { type: 'string', description: 'Ex: CH-00049' },
          },
          required: ['id', 'call_number'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'criar_saida',
        description: 'Lança despesa/saída financeira.',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            amount:      { type: 'number' },
            category:    { type: 'string', description: 'combustível | material | alimentação | salário | aluguel | manutenção | outros' },
            due_date:    { type: 'string', description: 'YYYY-MM-DD' },
            type:        { type: 'string', description: '"fixo" ou "variavel"' },
            notes:       { type: 'string' },
          },
          required: ['description', 'amount', 'category', 'due_date', 'type'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resumo_financeiro',
        description: 'Resumo financeiro (chamados, receitas, despesas).',
        parameters: {
          type: 'object',
          properties: {
            periodo: { type: 'string', description: '"hoje" | "semana" | "mes" | "mes_passado"' },
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

// ─── Tool execution ───────────────────────────────────────────────────────────

type ToolResult = { result: unknown; callId?: string; blocked?: boolean; blockedMsg?: string }

function resolveOrigin(origin: string, validOrigins: string[]): string | null {
  if (!validOrigins.length) return origin
  if (validOrigins.includes(origin)) return origin
  const lower = origin.toLowerCase().trim()
  const match = validOrigins.find(o =>
    o.toLowerCase() === lower ||
    (ORIGIN_LABELS[o] ?? '').toLowerCase() === lower ||
    (ORIGIN_LABELS[o] ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ===
      lower.normalize('NFD').replace(/[̀-ͯ]/g, '')
  )
  return match ?? null
}

function originInConversation(origin: string, history: GMsg[], curMsg: string): boolean {
  const texts = [
    ...history.filter(m => m.role === 'user').map(m => String(m.content ?? '')),
    curMsg,
  ].map(t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))

  const key = origin.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const label = (ORIGIN_LABELS[origin] ?? origin).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return texts.some(t => t.includes(key) || t.includes(label))
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  validOrigins: string[],
  history: GMsg[],
  curMsg: string,
): Promise<ToolResult> {
  const t = today()

  // ── criar_chamado ──────────────────────────────────────────────────────────
  if (name === 'criar_chamado') {
    const name_ = String(args.contact_name ?? '').trim()
    const PLACEHOLDERS = ['cliente', 'não informado', 'desconhecido', 'n/a', '']
    if (!name_ || PLACEHOLDERS.includes(name_.toLowerCase())) {
      return { result: {}, blocked: true, blockedMsg: 'Qual é o nome do cliente?' }
    }

    if (!args.origin) {
      const labels = validOrigins.map(o => ORIGIN_LABELS[o] ?? o).join(' / ')
      return { result: {}, blocked: true, blockedMsg: `Esse chamado veio de onde? (${labels})` }
    }

    // Validate & fuzzy-match origin
    const resolved = resolveOrigin(args.origin as string, validOrigins)
    if (!resolved) {
      const labels = validOrigins.map(o => ORIGIN_LABELS[o] ?? o).join(' / ')
      return { result: {}, blocked: true, blockedMsg: `Origem inválida. De onde veio esse chamado? (${labels})` }
    }
    args.origin = resolved

    // Origin must appear in conversation
    if (validOrigins.length > 0 && !originInConversation(resolved, history, curMsg)) {
      const labels = validOrigins.map(o => ORIGIN_LABELS[o] ?? o).join(' / ')
      return { result: {}, blocked: true, blockedMsg: `Esse chamado veio de onde? (${labels})` }
    }

    const { data, error } = await supabase
      .from('calls')
      .insert({
        tenant_id:         tenantId,
        contact_name:      args.contact_name,
        service_category:  args.service_category,
        status:            args.status,
        origin:            args.origin,
        date:              t,
        scheduled_date:    args.scheduled_date ?? null,
        scheduled_time:    args.scheduled_time ?? null,
        notes:             args.notes ?? null,
        driver:            args.driver ?? null,
        call_address:      args.call_address ?? null,
        call_neighborhood: args.call_neighborhood ?? null,
        call_city:         args.call_city ?? null,
        contact_phone:     args.contact_phone ?? null,
        contact_cpf:       args.contact_cpf ?? null,
        solicitante:       args.solicitante ?? null,
      })
      .select('id, call_number')
      .single()
    if (error) return { result: { erro: error.message } }

    if (args.status === 'aprovado' && args.total_value != null) {
      const tv = Number(args.total_value) || 0
      await supabase.from('service_orders').insert({
        tenant_id:      tenantId,
        call_id:        data.id,
        date:           t,
        total_value:    tv,
        remaining_amount: tv,
        payment_method: args.payment_method ?? null,
        payment_status: (args.payment_status as string) ?? 'pendente',
        execution_type: (args.execution_type as string) ?? 'proprio',
        driver:         args.driver ?? null,
        vehicle:        args.vehicle ?? null,
        notes:          args.os_notes ?? args.notes ?? null,
      })
    }

    return { result: { sucesso: true, chamado_numero: data.call_number, id: data.id }, callId: data.id }
  }

  // ── buscar_chamados ────────────────────────────────────────────────────────
  if (name === 'buscar_chamados') {
    const texto = String(args.texto ?? '').trim()
    const [direct, osRows] = await Promise.all([
      supabase
        .from('calls')
        .select('id, call_number, contact_name, service_category, status, date, scheduled_date, scheduled_time, call_address, call_city, origin, driver')
        .or(`contact_name.ilike.%${texto}%,call_number.ilike.%${texto}%,call_address.ilike.%${texto}%,call_city.ilike.%${texto}%,contact_phone.ilike.%${texto}%,contact_cpf.ilike.%${texto}%`)
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('service_orders').select('call_id').ilike('os_number', `%${texto}%`).limit(5),
    ])
    let results = [...(direct.data ?? [])]
    const osIds = (osRows.data ?? []).map((o: { call_id: string }) => o.call_id).filter(Boolean)
    if (osIds.length) {
      const { data } = await supabase
        .from('calls')
        .select('id, call_number, contact_name, service_category, status, date, scheduled_date, scheduled_time, call_address, call_city, origin, driver')
        .in('id', osIds)
      results = [...results, ...(data ?? [])]
    }
    const seen = new Set<string>()
    results = results.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
    if (args.status) results = results.filter(r => r.status === args.status)
    return { result: results.slice(0, 8) }
  }

  // ── deletar_chamado ────────────────────────────────────────────────────────
  if (name === 'deletar_chamado') {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_RE.test(String(args.id ?? ''))) {
      return { result: {}, blocked: true, blockedMsg: 'Use buscar_chamados primeiro para encontrar o ID correto do chamado.' }
    }
    const { data: check } = await supabase.from('calls').select('id, call_number').eq('id', args.id as string).single()
    if (!check) return { result: { erro: `Chamado ${args.id} não encontrado.` } }
    const { error } = await supabase.from('calls').delete().eq('id', args.id as string)
    if (error) return { result: { erro: error.message } }
    const { data: still } = await supabase.from('calls').select('id').eq('id', args.id as string).maybeSingle()
    if (still) return { result: { erro: 'Falha na deleção — sem permissão.' } }
    return { result: { sucesso: true, mensagem: `Chamado ${args.call_number} deletado.` } }
  }

  // ── criar_saida ────────────────────────────────────────────────────────────
  if (name === 'criar_saida') {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        tenant_id:   tenantId,
        description: args.description,
        amount:      args.amount,
        category:    args.category,
        due_date:    args.due_date,
        type:        args.type,
        status:      'pendente',
        notes:       args.notes ?? null,
      })
      .select('id, description, amount').single()
    if (error) return { result: { erro: error.message } }
    return { result: { sucesso: true, id: data.id, description: data.description, amount: data.amount } }
  }

  // ── resumo_financeiro ──────────────────────────────────────────────────────
  if (name === 'resumo_financeiro') {
    const p = String(args.periodo ?? 'mes')
    let start = t, end = t
    if (p === 'semana') {
      start = addDays(t, -7)
    } else if (p === 'mes') {
      const d = new Date(); start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    } else if (p === 'mes_passado') {
      const d = new Date(); d.setMonth(d.getMonth() - 1)
      start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    }
    const [cR, oR, eR] = await Promise.all([
      supabase.from('calls').select('status').gte('date', start).lte('date', end),
      supabase.from('service_orders').select('total_value, payment_status, remaining_amount').gte('date', start).lte('date', end),
      supabase.from('expenses').select('amount, status').gte('due_date', start).lte('due_date', end),
    ])
    const calls = cR.data ?? [], orders = oR.data ?? [], expenses = eR.data ?? []
    const receita = orders.reduce((s: number, o: { total_value: number }) => s + (o.total_value || 0), 0)
    const despesas = expenses.reduce((s: number, e: { amount: number }) => s + (e.amount || 0), 0)
    const a_receber = orders
      .filter((o: { payment_status: string }) => ['pendente', 'pago_parcial'].includes(o.payment_status))
      .reduce((s: number, o: { remaining_amount: number; total_value: number }) => s + (o.remaining_amount || o.total_value || 0), 0)
    return {
      result: {
        periodo: `${start} a ${end}`,
        total_chamados: calls.length,
        aprovados:   calls.filter((c: { status: string }) => c.status === 'aprovado').length,
        agendados:   calls.filter((c: { status: string }) => c.status === 'agendado').length,
        nao_aprovados: calls.filter((c: { status: string }) => c.status === 'nao_aprovou').length,
        cancelados:  calls.filter((c: { status: string }) => c.status === 'cancelado').length,
        receita_bruta: receita,
        total_despesas: despesas,
        receita_liquida: receita - despesas,
        a_receber,
      },
    }
  }

  // ── listar_a_receber ───────────────────────────────────────────────────────
  if (name === 'listar_a_receber') {
    const { data, error } = await supabase
      .from('service_orders')
      .select('id, date, total_value, remaining_amount, remaining_due_date, payment_status, call:calls(contact_name, call_number)')
      .in('payment_status', ['pendente', 'pago_parcial'])
      .order('remaining_due_date', { ascending: true }).limit(10)
    if (error) return { result: { erro: error.message } }
    return { result: data ?? [] }
  }

  // ── listar_saidas_pendentes ────────────────────────────────────────────────
  if (name === 'listar_saidas_pendentes') {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount, category, due_date, type')
      .eq('status', 'pendente')
      .order('due_date', { ascending: true }).limit(10)
    if (error) return { result: { erro: error.message } }
    return { result: data ?? [] }
  }

  return { result: { erro: 'Função desconhecida' } }
}

// ─── Quick reply detection ─────────────────────────────────────────────────────

function detectQuickReplies(text: string, origins: string[]): string[] | undefined {
  const lower = text.toLowerCase()
  const isAskingOrigin = origins.length > 0 && (
    lower.includes('veio de onde') || lower.includes('qual a origem') ||
    lower.includes('de onde veio') || lower.includes('origem')
  )
  if (isAskingOrigin) return origins.map(o => ORIGIN_LABELS[o] ?? o)

  if (lower.includes('opcionais') || lower.includes('opcional')) {
    return ['Sim, quero adicionar', 'Não, obrigado']
  }
  if ((lower.includes('telefone') || lower.includes('celular')) && lower.includes('deseja')) {
    return ['Sim, tenho telefone', 'Não, obrigado']
  }
  if ((lower.includes('cpf') || lower.includes('cnpj')) && lower.includes('deseja')) {
    return ['Sim, tenho CPF/CNPJ', 'Não, obrigado']
  }
  if ((lower.includes('confirma') || lower.includes('tem certeza')) && (lower.includes('delet') || lower.includes('exclu'))) {
    return ['Sim, deletar', 'Não, cancelar']
  }
  return undefined
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(origins: string[], originsText: string): string {
  const t = today()
  const originLabels = origins.map(o => ORIGIN_LABELS[o] ?? o).join(' / ')

  return `Você é o Connect IA do Connect Financeiro (desentupimento). Responda em pt-BR, seja direto.
Hoje: ${t} | Amanhã: ${addDays(t, 1)}
Origens: ${originsText}

SERVIÇOS (mapeie sempre — nunca coloque em notes):
Desentupimento | Hidrojateamento | Limpeza (fossa/caixa gordura) | Sucção (esvaziar fossa) | Aplicação de CO2 | Reclamação | Outros

MAPEAMENTO DE INTENÇÃO (MUITO IMPORTANTE):
- "romaneio", "preciso de um romaneio", "gerar romaneio" → o usuário quer CRIAR UM CHAMADO (agendado). Romaneio é o comprovante que é gerado após criar o chamado.
- "chamado", "agendamento", "preciso agendar", "tem um serviço" → criar chamado agendado
- "aprovado", "fechar serviço", "cliente aprovou" → criar chamado aprovado
- NUNCA interprete "romaneio" como saída financeira ou despesa.

CRIAR CHAMADO AGENDADO:
Obrigatórios: nome do cliente, origem, tipo de serviço, data e hora
Opcionais: endereço, técnico, solicitante, telefone, CPF/CNPJ, observações

CRIAR CHAMADO APROVADO:
Obrigatórios: nome do cliente, origem, tipo de serviço, valor (R$), forma de pagamento (dinheiro/cartão/PIX/boleto)
Opcionais: endereço, técnico, veículo, solicitante, telefone, CPF/CNPJ, tipo de execução

REGRAS:
1. Identifique o que já foi dito na mensagem. Só peça o que falta.
2. Se faltam vários obrigatórios, peça TODOS de uma vez (não um por um).
3. Com todos os obrigatórios prontos, pergunte: "Deseja adicionar informações opcionais? (endereço, técnico, telefone, etc.)"
4. Após resposta sobre opcionais, CRIE com criar_chamado.
5. Ao perguntar origem, use os rótulos: ${originLabels}
6. NUNCA invente ou assuma origem. NUNCA use "Cliente" como nome.

DELETAR: busque primeiro, mostre resultado, confirme, depois delete.
Formate valores: R$ X.XXX,XX | Após criar chamado, informe o número (ex: CH-00051) e que o romaneio está disponível.`
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json() as { message: string; history: GMsg[] }
    if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'API key não configurada' }, { status: 500 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const tenantId = profile.tenant_id
    const { data: tenantData } = await supabase.from('tenants').select('call_origins').eq('id', tenantId).single()
    const origins: string[] = tenantData?.call_origins ?? []
    const originsText = origins.length
      ? origins.map(o => `${o}="${ORIGIN_LABELS[o] ?? o}"`).join(', ')
      : 'indicacao="Indicação", terceirizado="Terceirizado"'

    const TOOLS = buildTools(origins)
    const systemPrompt = buildSystemPrompt(origins, originsText)

    // Keep last 12 messages (6 turns) for context
    const trimmedHistory = (Array.isArray(history) ? history : []).slice(-12) as GMsg[]

    const messages: GMsg[] = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message },
    ]

    // ── Round 1: first AI call ─────────────────────────────────────────────
    const r1 = await groqCall(messages, TOOLS)
    const msg1 = r1.choices[0].message

    // No tool call → return text directly (fastest path, 1 Groq call)
    if (!msg1.tool_calls?.length) {
      const reply = msg1.content ?? 'Como posso ajudar?'
      return NextResponse.json({ reply, quickReplies: detectQuickReplies(reply, origins) })
    }

    const tc = msg1.tool_calls[0]
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }

    const toolRes = await executeTool(tc.function.name, args, supabase, tenantId, origins, messages, message)

    // If blocked → return blocked message directly (no second Groq call)
    if (toolRes.blocked && toolRes.blockedMsg) {
      return NextResponse.json({
        reply: toolRes.blockedMsg,
        quickReplies: detectQuickReplies(toolRes.blockedMsg, origins),
      })
    }

    // ── Round 2: feed tool result back for final reply ─────────────────────
    const msgs2: GMsg[] = [
      ...messages,
      msg1,
      { role: 'tool' as const, tool_call_id: tc.id, content: JSON.stringify(toolRes.result) },
    ]
    const r2 = await groqCall(msgs2, TOOLS)
    const reply = r2.choices[0].message.content ?? 'Feito!'

    const ACTION_LABELS: Record<string, string> = {
      criar_chamado:          'Chamado criado',
      buscar_chamados:        'Chamados consultados',
      criar_saida:            'Saída lançada',
      resumo_financeiro:      'Relatório gerado',
      listar_a_receber:       'A receber consultado',
      listar_saidas_pendentes: 'Contas consultadas',
    }

    return NextResponse.json({
      reply,
      functionCalled: tc.function.name in ACTION_LABELS ? tc.function.name : undefined,
      callId: toolRes.callId,
      quickReplies: detectQuickReplies(reply, origins),
    })

  } catch (err: unknown) {
    console.error('Chat error:', err)
    if ((err as { status?: number })?.status === 429) {
      return NextResponse.json({ error: 'Limite de uso atingido. Aguarde alguns minutos.' }, { status: 429 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
