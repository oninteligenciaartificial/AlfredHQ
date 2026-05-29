'use client'

import { useState, useRef, useEffect } from 'react'
import type { AgentMode } from '@/types'
import { Send, Loader2, Zap, Eye } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentMode, setAgentMode] = useState<AgentMode>('advisory')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.json())
      .then((data: { workspaceId?: string }) => {
        if (data.workspaceId) setWorkspaceId(data.workspaceId)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agentMode,
          ...(workspaceId ? { workspaceId } : {}),
        }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')
      if (!res.body) throw new Error('Sin body en respuesta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: 'Error al conectar con el agente. Verifica tu API key.',
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-zinc-600">Modo:</span>
        <button
          onClick={() => setAgentMode('advisory')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            agentMode === 'advisory'
              ? 'bg-blue-100 text-blue-700'
              : 'text-zinc-500 hover:bg-zinc-100'
          }`}
        >
          <Eye className="h-3 w-3" />
          Advisory
        </button>
        <button
          onClick={() => setAgentMode('execution')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            agentMode === 'execution'
              ? 'bg-amber-100 text-amber-700'
              : 'text-zinc-500 hover:bg-zinc-100'
          }`}
        >
          <Zap className="h-3 w-3" />
          Execution
        </button>
        {agentMode === 'execution' && (
          <span className="ml-2 text-xs text-amber-600">
            Alfred puede ejecutar acciones
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-zinc-900">Alfred</p>
              <p className="mt-1 text-sm text-zinc-500">
                Tu asistente de redes sociales. ¿En qué puedo ayudarte hoy?
              </p>
              <div className="mt-6 grid gap-2 text-left">
                {[
                  '¿Cómo puedo mejorar mi engagement en Instagram?',
                  'Genera 5 ideas de contenido para esta semana',
                  'Analiza mi estrategia actual y sugiere mejoras',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-800'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && loading && (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
