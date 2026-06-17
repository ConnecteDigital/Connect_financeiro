'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles, Plus } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'

interface Message {
  role: 'user' | 'assistant'
  text: string
  functionCalled?: string
  timestamp: Date
}

const SUGGESTIONS = [
  'Crie um chamado agendado para amanhã às 14h',
  'Quantos chamados temos hoje?',
  'Resumo financeiro deste mês',
  'Liste as contas a pagar pendentes',
  'Lançar despesa de combustível R$ 200',
  'Quem ainda não pagou?',
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

function MessageBubble({ msg, primaryColor }: { msg: Message; primaryColor: string }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser ? primaryColor : 'var(--surface-secondary)',
          boxShadow: isUser ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
        }}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" />
          : <Bot className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
        }
      </div>

      <div className={`flex flex-col gap-1 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Function badge */}
        {msg.functionCalled && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-100">
            {ACTION_LABELS[msg.functionCalled] ?? `✓ ${msg.functionCalled}`}
          </span>
        )}

        {/* Bubble */}
        <div
          className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
          style={isUser
            ? { background: primaryColor, color: '#fff', borderBottomRightRadius: 6 }
            : { background: 'var(--surface)', color: 'var(--text-primary)', borderBottomLeftRadius: 6, boxShadow: 'var(--shadow-sm)' }
          }>
          {msg.text}
        </div>

        {/* Time */}
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { tenant } = useTenant()
  const primaryColor = tenant?.primary_color ?? '#f97316'

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Olá! Sou o Assistente IA do Connect Financeiro. 👋\n\nPosso criar chamados, lançar saídas, consultar finanças e muito mais — só me falar o que precisa!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<{ role: string; parts: { text: string }[] }[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', text: trimmed, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build Gemini history (exclude the initial greeting, and only include real conversation)
    const newHistory = [
      ...historyRef.current,
      { role: 'user', parts: [{ text: trimmed }] },
    ]

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historyRef.current }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

      const assistantText = data.reply ?? 'Desculpe, não consegui processar sua mensagem.'
      const assistantMsg: Message = {
        role: 'assistant',
        text: assistantText,
        functionCalled: data.functionCalled,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])

      // Update history for next turn
      historyRef.current = [
        ...newHistory,
        { role: 'model', parts: [{ text: assistantText }] },
      ]
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Erro ao conectar com o assistente'
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Ops, ocorreu um erro: ${errMsg}`,
        timestamp: new Date(),
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

  function clearChat() {
    setMessages([{
      role: 'assistant',
      text: `Conversa reiniciada! Como posso ajudar?`,
      timestamp: new Date(),
    }])
    historyRef.current = []
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--bottom-nav-height)-var(--safe-bottom)-80px)] lg:h-[calc(100dvh-64px)] max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: `rgba(var(--primary-rgb), 0.12)` }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Assistente IA</h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Powered by Gemini</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition"
          style={{ color: 'var(--text-secondary)', background: 'var(--surface-secondary)' }}>
          <Plus className="w-3.5 h-3.5" /> Nova conversa
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-3">

        {/* Suggestions (show only if only the greeting) */}
        {messages.length === 1 && (
          <div className="pt-1">
            <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
              Sugestões rápidas:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-xl border font-medium transition active:scale-95"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                    background: 'var(--surface)',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} primaryColor={primaryColor} />
        ))}

        {loading && (
          <div className="flex gap-2.5 flex-row">
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

      {/* ── Input ── */}
      <div className="flex-shrink-0 pt-3">
        <div className="flex items-end gap-2 rounded-2xl border p-2 transition-shadow focus-within:shadow-md"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
          }}>
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
            style={{
              color: 'var(--text-primary)',
              maxHeight: 120,
              minHeight: 36,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition active:scale-90 disabled:opacity-40"
            style={{ background: primaryColor }}>
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
