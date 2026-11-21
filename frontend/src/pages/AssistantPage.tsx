import { useState } from 'react'
import {
  ArrowUpwardRounded,
  AutoAwesomeRounded,
  PersonOutlineRounded,
} from '@mui/icons-material'
import { IconButton, TextField } from '@mui/material'
import type { ChatResponse, User } from '../types'

type Message = {
  id: string
  role: 'assistant' | 'user'
  text: string
  source?: string
  disclaimer?: string
}

type Props = {
  user: User
  onAsk: (question: string) => Promise<ChatResponse>
  error?: string
}

const WELCOME_ID = 'assistant-welcome'

const suggestions = [
  'What are the side effects of Paracetamol?',
  'Can I take Ibuprofen with Warfarin?',
  'Help me understand a medication leaflet.',
]

function welcomeMessage(displayName: string): Message {
  const name = displayName.trim() || 'there'
  return {
    id: WELCOME_ID,
    role: 'assistant',
    text: (
      `Hello, ${name}. I'm the HealthVector assistant.\n\n` +
      'I can explain information from official medication leaflets, check known interactions, ' +
      'help add a catalog medication, and propose a daily dose schedule — you still approve that schedule in the app.\n\n' +
      'Ask me anything about a medication in the leaflet database, or pick a prompt below to get started.'
    ),
  }
}

export default function AssistantPage({ user, onAsk, error }: Props) {
  const displayName = user.email.split('@')[0]
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => [welcomeMessage(displayName)])
  const [asking, setAsking] = useState(false)
  const [requestError, setRequestError] = useState('')

  const submit = async (value: string) => {
    const text = value.trim()
    if (!text || asking) return
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text }
    setMessages((current) => [...current, userMessage])
    setQuestion('')
    setAsking(true)
    setRequestError('')
    try {
      const response = await onAsk(text)
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.answer,
        source: [response.source_leaflet, response.source_section].filter(Boolean).join(' · '),
        disclaimer: response.disclaimer,
      }])
    } catch (askError) {
      setRequestError(askError instanceof Error ? askError.message : 'The assistant could not answer right now.')
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="page-content assistant-page">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">HERE WHEN YOU NEED A LITTLE CLARITY</div>
          <h1>AI assistant</h1>
          <p>Ask questions about your medication leaflets and get clear, helpful information.</p>
        </div>
      </section>
      {error && <div className="inline-notice error-notice" role="alert">{error}</div>}
      <section className="assistant-chat panel">
        <div className="assistant-chat-header">
          <div className="assistant-avatar"><AutoAwesomeRounded /></div>
          <div><strong>Your medication companion</strong><span>Answers from the information available in your leaflets</span></div>
          <span className="assistant-online"><i /> Ready to help</span>
        </div>
        <div className="chat-messages">
          {messages.map((message) => (
            <div className={`chat-message ${message.role}`} key={message.id}>
              <div className="chat-message-avatar">{message.role === 'assistant' ? <AutoAwesomeRounded /> : <PersonOutlineRounded />}</div>
              <div className="chat-message-content">
                <span className="chat-author">{message.role === 'assistant' ? 'HealthVector assistant' : 'You'}</span>
                <p>{message.text}</p>
                {message.source && <span className="chat-source">Source: {message.source}</span>}
                {message.id !== WELCOME_ID && (
                  <small>{message.disclaimer || 'Prototype only. Not professional medical advice.'}</small>
                )}
              </div>
            </div>
          ))}
          {messages.length === 1 && messages[0]?.id === WELCOME_ID && (
            <div className="suggestion-list">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => void submit(suggestion)}>
                  {suggestion}<span>↗</span>
                </button>
              ))}
            </div>
          )}
          {asking && <div className="typing-indicator"><span /><span /><span /> Looking into that for you…</div>}
        </div>
        {requestError && <p className="chat-error" role="alert">{requestError}</p>}
        <form className="chat-composer" onSubmit={(event) => {
          event.preventDefault()
          void submit(question)
        }}>
          <TextField
            placeholder="Ask a question about your medication..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            multiline
            maxRows={4}
            fullWidth
            slotProps={{ htmlInput: { 'aria-label': 'Your question' } }}
          />
          <IconButton type="submit" className="send-button" disabled={!question.trim() || asking} aria-label="Send question">
            <ArrowUpwardRounded />
          </IconButton>
        </form>
        <p className="assistant-disclaimer">Prototype only. Not professional medical advice.</p>
      </section>
    </div>
  )
}
