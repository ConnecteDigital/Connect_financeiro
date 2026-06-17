'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Sparkles, Plus, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useTenant } from '@/lib/tenant-context'

interface Message {
  role: 'user' | 'assistant'
  text: string
  functionCalled?: string
  callId?: string
  quickReplies?: string[]
  timestamp: string
}

interface HistoryItem {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'connect_chat_messages'
const HISTORY_KEY = 'connect_chat_history'

const SUGGESTIONS = [
  'Criar chamado agendado para amanhã',
  'Resumo financeiro deste mês',
  'Quem ainda não pagou?',
  'Liste os últimos 5 chamados',
  'Lançar despesa de combustível',
  'Contas a pagar pendentes',
]

const ACTION_LABELS: Record<string, string> = {
  criar_chamado: '✓ Chamado criado',
  listar_chamados: '✓ Chamados consultados',
  criar_saida: '✓ Saída lançada',
  resumo_financeiro: '✓ Relatório gerado',
  listar_a_receber: '✓ A receber consultado',
  listar_saidas_pendentes: '✓ Contas consultadas',
  buscar_cliente: '✓ Cliente buscado',
}

const GREETING: Message = {
  role: 'assistant',
  text: 'Olá! Sou o Assistente IA do Connect Financeiro.\n\nPosso criar chamados, lançar saídas, consultar finanças e muito mais — só me falar o que precisa!',
  timestamp: new Date().toISOString(),
}

function MessageBubble({ msg, primaryColor, onQuickReply, isLast }: {
  msg: Message
  primaryColor: string
  onQuickReply?: (text: string) => void
  isLast?: boolean
}) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: isUser ? primaryColor : 'var(--surface-secondary)' }}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />}
      </div>

      <div className={`flex flex-col gap-1.5 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        {msg.functionCalled && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-100">
            {ACTION_LABELS[msg.functionCalled] ?? `✓ ${msg.functionCalled}`}
          </span>
        )}

        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
          style={isUser
            ? { background: primaryColor, color: '#fff', borderBottomRightRadius: 6 }
            : { background: 'var(--surface)', color: 'var(--text-primary)', borderBottomLeftRadius: 6, boxShadow: 'var(--shadow-sm)' }}>
          {msg.text}
        </div>

        {/* Quick reply chips — só na última mensagem */}
        {isLast && msg.quickReplies && msg.quickReplies.length > 0 && onQuickReply && (
          <div className="flex flex-wrap gap-2 mt-1">
            {msg.quickReplies.map(qr => (
              <button
                key={qr}
                onClick={() => onQuickReply(qr)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border transition active:scale-95"
                style={{
                  borderColor: `rgba(var(--primary-rgb), 0.35)`,
                  color: 'var(--primary)',
                  background: `rgba(var(--primary-rgb), 0.06)`,
                }}>
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* Romaneio button */}
        {msg.callId && (
          <Link
            href={`/dashboard/chamados/${msg.callId}/romaneio`}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition active:scale-95"
            style={{ background: 'var(--surface)', color: primaryColor, boxShadow: 'var(--shadow-sm)', border: `1px solid rgba(var(--primary-rgb), 0.2)` }}>
            <FileText className="w-3.5 h-3.5" />
            Ver Romaneio
          </Link>
        )}

        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{time}</span>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { tenant } = useTenant()
  const primaryColor = tenant?.primary_color ?? '#f97316'

  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<HistoryItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY)
      const savedHistory = localStorage.getItem(HISTORY_KEY)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages) as Message[]
        if (parsed.length > 0) setMessages(parsed)
      }
      if (savedHistory) {
        historyRef.current = JSON.parse(savedHistory) as HistoryItem[]
      }
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  // Save to localStorage on messages change
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch { /* ignore */ }
  }, [messages, hydrated])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const clearChat = useCallback(() => {
    const greeting = { ...GREETING, timestamp: new Date().toISOString() }
    setMessages([greeting])
    historyRef.current = []
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(HISTORY_KEY)
    } catch { /* ignore */ }
  }, [])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', text: trimmed, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const currentHistory = [...historyRef.current]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: currentHistory }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

      const assistantText = data.reply ?? 'Desculpe, não consegui processar sua mensagem.'
      const assistantMsg: Message = {
        role: 'assistant',
        text: assistantText,
        functionCalled: data.functionCalled,
        callId: data.callId,
        quickReplies: data.quickReplies,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      const newHistory: HistoryItem[] = [
        ...currentHistory,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: assistantText },
      ]
      historyRef.current = newHistory
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
      } catch { /* ignore */ }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Erro ao conectar com o assistente'
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Ops, ocorreu um erro: ${errMsg}`,
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--bottom-nav-height)-var(--safe-bottom)-80px)] lg:h-[calc(100dvh-64px)] max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `rgba(var(--primary-rgb), 0.12)` }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Assistente IA</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Powered by Groq</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-secondary)' }}
          title="Nova conversa">
          {messages.length > 1
            ? <><Trash2 className="w-3.5 h-3.5" /> Limpar</>
            : <><Plus className="w-3.5 h-3.5" /> Nova</>}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-3">
        {messages.length === 1 && (
          <div className="pt-1">
            <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
              Sugestões rápidas:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-xl border font-medium transition active:scale-95"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            msg={msg}
            primaryColor={primaryColor}
            isLast={i === messages.length - 1}
            onQuickReply={!loading ? sendMessage : undefined}
          />
        ))}

        {/* Aviso: resposta perdida ao navegar enquanto processava */}
        {!loading && hydrated && messages.length > 1 && messages[messages.length - 1].role === 'user' && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--surface-secondary)' }}>
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-tertiary)' }}>
              A resposta foi perdida ao navegar. Envie sua mensagem novamente.
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--surface-secondary)' }}>
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-2"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Processando...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3">
        <div className="flex items-end gap-2 rounded-2xl border p-2"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando ou pergunta..."
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1 px-1 leading-relaxed"
            style={{ color: 'var(--text-primary)', maxHeight: 120, minHeight: 36 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition active:scale-90 disabled:opacity-40"
            style={{ background: primaryColor }}>
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
