#!/usr/bin/env node
/**
 * migrate.mjs — Migração Líder + Millenium → Connect Financeiro
 *
 * Pré-requisito: Node.js 18+ (fetch nativo)
 * Uso: node migrate.mjs
 *      node migrate.mjs --dry-run   (só mostra o que seria importado, não insere nada)
 */

const DRY_RUN = process.argv.includes('--dry-run')

// ─── Configuração dos bancos ───────────────────────────────────────────────
// Preencha aqui ou exporte as variáveis de ambiente antes de rodar:
//   export LIDER_URL=https://SEU_PROJETO.supabase.co
//   export LIDER_KEY=sb_secret_...
//   export MILL_URL=https://SEU_PROJETO.supabase.co
//   export MILL_KEY=sb_secret_...
//   export CONNECT_URL=https://SEU_PROJETO.supabase.co
//   export CONNECT_KEY=sb_secret_...
const LIDER = {
  url: process.env.LIDER_URL || 'PREENCHA_AQUI',
  key: process.env.LIDER_KEY || 'PREENCHA_AQUI',
  label: 'Líder',
}
const MILLENIUM = {
  url: process.env.MILL_URL || 'PREENCHA_AQUI',
  key: process.env.MILL_KEY || 'PREENCHA_AQUI',
  label: 'Millenium',
}
const CONNECT = {
  url: process.env.CONNECT_URL || 'PREENCHA_AQUI',
  key: process.env.CONNECT_KEY || 'PREENCHA_AQUI',
}

// ─── Utilitários REST ──────────────────────────────────────────────────────
function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  }
}

async function fetchAll(db, table, select = '*') {
  const rows = []
  let offset = 0
  const limit = 1000
  while (true) {
    const url = `${db.url}/rest/v1/${table}?select=${select}&limit=${limit}&offset=${offset}`
    const res = await fetch(url, { headers: headers(db.key) })
    if (!res.ok) {
      const txt = await res.text()
      // tabela não existe no banco antigo → retorna array vazio silenciosamente
      if (res.status === 404 || txt.includes('does not exist')) return []
      console.warn(`  ⚠  Aviso ao ler ${table}: ${txt.slice(0, 120)}`)
      return rows
    }
    const data = await res.json()
    if (!Array.isArray(data)) { console.warn(`  ⚠  ${table} retornou formato inesperado`); return rows }
    rows.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  return rows
}

async function insertBatch(table, rows) {
  if (rows.length === 0) return 0
  if (DRY_RUN) return rows.length
  const BATCH = 200
  let total = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const res = await fetch(`${CONNECT.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: headers(CONNECT.key),
      body: JSON.stringify(batch),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error(`  ✗  Erro inserindo em ${table} (lote ${i}): ${txt.slice(0, 200)}`)
    } else {
      total += batch.length
    }
  }
  return total
}

async function runSQL(sql) {
  if (DRY_RUN) return null
  const res = await fetch(`${CONNECT.url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: headers(CONNECT.key),
    body: JSON.stringify({ query: sql }),
  })
  // ignora erro se a função não existir
  return res.ok ? await res.json() : null
}

// ─── Mapeamentos de status ─────────────────────────────────────────────────
const VALID_CALL_STATUS = ['agendado', 'aprovado', 'nao_aprovou', 'nao_quis_visita', 'cancelado']
const VALID_OS_TYPE = ['proprio', 'terceirizado_saida', 'terceirizado_entrada']
const VALID_PAYMENT_STATUS = ['pago', 'pago_parcial', 'pendente']

function mapCallStatus(s) {
  if (VALID_CALL_STATUS.includes(s)) return s
  if (s === 'recusado' || s === 'nao_aprovou') return 'nao_aprovou'
  return 'agendado'
}
function mapOsType(s) {
  if (VALID_OS_TYPE.includes(s)) return s
  if (s === 'terceirizado') return 'terceirizado_saida'
  return 'proprio'
}
function mapPaymentStatus(s) {
  return VALID_PAYMENT_STATUS.includes(s) ? s : 'pendente'
}

// Remove campos que o novo schema não tem ou que são gerados automaticamente
function strip(row, drop = []) {
  const r = { ...row }
  for (const k of drop) delete r[k]
  delete r.tenant_id // será atribuído novo
  return r
}

// ─── Migração de um banco antigo para um tenant ────────────────────────────
async function migrateSource(db, tenantId) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  Migrando: ${db.label}  →  tenant ${tenantId}`)
  console.log(`${'═'.repeat(60)}`)

  // ── Clientes ──────────────────────────────────────────────────
  console.log('\n📋 Clientes...')
  const rawClients = await fetchAll(db, 'clients')
  const clients = rawClients.map(r => ({
    ...strip(r, ['code']),          // deixa trigger gerar novo código
    tenant_id: tenantId,
  }))
  const c = await insertBatch('clients', clients)
  console.log(`   ✓ ${c} / ${clients.length} clientes`)

  // ── Fornecedores ──────────────────────────────────────────────
  console.log('\n🏭 Fornecedores...')
  const rawSuppliers = await fetchAll(db, 'suppliers')
  const suppliers = rawSuppliers.map(r => ({
    ...strip(r),
    tenant_id: tenantId,
  }))
  const s = await insertBatch('suppliers', suppliers)
  console.log(`   ✓ ${s} / ${suppliers.length} fornecedores`)

  // ── Equipes ───────────────────────────────────────────────────
  console.log('\n👷 Equipes...')
  const rawTeams = await fetchAll(db, 'teams')
  const teams = rawTeams.map(r => ({
    ...strip(r),
    tenant_id: tenantId,
  }))
  const t = await insertBatch('teams', teams)
  console.log(`   ✓ ${t} / ${teams.length} equipes`)

  // ── Auxiliares ────────────────────────────────────────────────
  console.log('\n🔧 Auxiliares...')
  const rawAux = await fetchAll(db, 'auxiliaries')
  const auxiliaries = rawAux.map(r => ({
    ...strip(r),
    tenant_id: tenantId,
  }))
  const ax = await insertBatch('auxiliaries', auxiliaries)
  console.log(`   ✓ ${ax} / ${auxiliaries.length} auxiliares`)

  // ── Tipos de Serviço ──────────────────────────────────────────
  console.log('\n🔩 Tipos de Serviço...')
  const rawST = await fetchAll(db, 'service_types')
  const serviceTypes = rawST.map(r => ({
    ...strip(r),
    tenant_id: tenantId,
  }))
  const st = await insertBatch('service_types', serviceTypes)
  console.log(`   ✓ ${st} / ${serviceTypes.length} tipos de serviço`)

  // ── Chamados ──────────────────────────────────────────────────
  console.log('\n📞 Chamados...')
  const rawCalls = await fetchAll(db, 'calls')
  const calls = rawCalls.map(r => {
    const row = strip(r, ['call_number']) // trigger gera novo número
    return {
      ...row,
      tenant_id: tenantId,
      status: mapCallStatus(row.status),
      // campo pode ter nome antigo 'service_type' → renomear
      service_category: row.service_category || row.service_type || null,
    }
  })
  // remove campo legado que não existe no novo schema
  calls.forEach(r => delete r.service_type)

  const ca = await insertBatch('calls', calls)
  console.log(`   ✓ ${ca} / ${calls.length} chamados`)

  // ── Ordens de Serviço ─────────────────────────────────────────
  console.log('\n📄 Ordens de Serviço...')
  const rawOS = await fetchAll(db, 'service_orders')
  const orders = rawOS.map(r => {
    const row = strip(r, ['os_number']) // trigger gera novo número
    return {
      ...row,
      tenant_id: tenantId,
      service_type: mapOsType(row.service_type),
      payment_status: mapPaymentStatus(row.payment_status),
    }
  })
  const os = await insertBatch('service_orders', orders)
  console.log(`   ✓ ${os} / ${orders.length} ordens de serviço`)

  // ── Itens das OS ──────────────────────────────────────────────
  console.log('\n📦 Itens das OS...')
  const rawItems = await fetchAll(db, 'service_order_items')
  const items = rawItems.map(r => {
    const row = { ...r }
    delete row.total        // coluna GENERATED ALWAYS — não pode inserir
    delete row.tenant_id
    return row
  })
  const it = await insertBatch('service_order_items', items)
  console.log(`   ✓ ${it} / ${items.length} itens de OS`)

  // ── Saídas / Despesas ─────────────────────────────────────────
  console.log('\n💸 Saídas (Despesas)...')
  const rawExp = await fetchAll(db, 'expenses')
  const expenses = rawExp.map(r => ({
    ...strip(r),
    tenant_id: tenantId,
  }))
  const ex = await insertBatch('expenses', expenses)
  console.log(`   ✓ ${ex} / ${expenses.length} saídas`)

  return {
    clients: clients.length,
    suppliers: suppliers.length,
    teams: teams.length,
    auxiliaries: auxiliaries.length,
    serviceTypes: serviceTypes.length,
    calls: calls.length,
    orders: orders.length,
    items: items.length,
    expenses: expenses.length,
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Connect Financeiro — Script de Migração')
  console.log(DRY_RUN ? '   (MODO SIMULAÇÃO — nenhum dado será inserido)\n' : '')

  // 1. Buscar tenants cadastrados no novo sistema
  console.log('🔍 Buscando tenants no sistema Connect...')
  const res = await fetch(`${CONNECT.url}/rest/v1/tenants?select=id,slug,name`, {
    headers: headers(CONNECT.key),
  })
  if (!res.ok) {
    console.error('✗ Não foi possível acessar o banco Connect:', await res.text())
    process.exit(1)
  }
  const tenants = await res.json()
  if (!tenants.length) {
    console.error('✗ Nenhum tenant encontrado no banco Connect. Cadastre os tenants primeiro no sistema.')
    process.exit(1)
  }

  console.log('   Tenants encontrados:')
  tenants.forEach((t, i) => console.log(`     [${i}] ${t.name}  (slug: ${t.slug}, id: ${t.id})`))

  // 2. Mapear automaticamente por slug/nome
  const findTenant = (keywords) =>
    tenants.find(t =>
      keywords.some(k => t.slug?.toLowerCase().includes(k) || t.name?.toLowerCase().includes(k))
    )

  const liderTenant = findTenant(['lider', 'líder', 'leader'])
  const millTenant  = findTenant(['millenium', 'milenium', 'millennium'])

  if (!liderTenant) {
    console.error('\n✗ Não encontrei o tenant da Líder. Certifique-se de que existe um tenant com "lider" no slug ou nome.')
    console.error('  Tenants disponíveis:', tenants.map(t => t.slug).join(', '))
    process.exit(1)
  }
  if (!millTenant) {
    console.error('\n✗ Não encontrei o tenant da Millenium. Certifique-se de que existe um tenant com "millenium" no slug ou nome.')
    console.error('  Tenants disponíveis:', tenants.map(t => t.slug).join(', '))
    process.exit(1)
  }

  console.log(`\n   ✓ Líder     → tenant "${liderTenant.name}" (${liderTenant.id})`)
  console.log(`   ✓ Millenium → tenant "${millTenant.name}" (${millTenant.id})`)

  // 3. Migrar cada banco
  const summaryLider = await migrateSource(LIDER, liderTenant.id)
  const summaryMill  = await migrateSource(MILLENIUM, millTenant.id)

  // 4. Resumo final
  console.log('\n' + '═'.repeat(60))
  console.log('  RESUMO FINAL')
  console.log('═'.repeat(60))
  const totals = {}
  for (const k of Object.keys(summaryLider)) {
    totals[k] = (summaryLider[k] || 0) + (summaryMill[k] || 0)
  }
  console.log(`  Clientes:          ${totals.clients}`)
  console.log(`  Fornecedores:      ${totals.suppliers}`)
  console.log(`  Equipes:           ${totals.teams}`)
  console.log(`  Auxiliares:        ${totals.auxiliaries}`)
  console.log(`  Tipos de serviço:  ${totals.serviceTypes}`)
  console.log(`  Chamados:          ${totals.calls}`)
  console.log(`  Ordens de serviço: ${totals.orders}`)
  console.log(`  Itens de OS:       ${totals.items}`)
  console.log(`  Saídas:            ${totals.expenses}`)

  if (DRY_RUN) {
    console.log('\n  ⚡ Modo simulação — rode sem --dry-run para importar de verdade.')
  } else {
    console.log('\n  ✅ Migração concluída! Verifique os dados no sistema.')
    console.log('  ⚠  Lembre-se de trocar as senhas dos bancos após confirmar tudo.')
  }
}

main().catch(err => { console.error('\n✗ Erro fatal:', err.message); process.exit(1) })
