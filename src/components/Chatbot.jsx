import { useState, useRef, useEffect } from 'react'
import { QUICK_PROMPTS, getBotResponse } from '../lib/chatbotKnowledge'
import { profile } from '../data'
import Bot from './Bot'
import Icon from './Icons'
import '../styles/chat.css'

function formatMessageText(text) {
  // Simple markdown renderer for bold, lists, and links
  const lines = text.split('\n')
  return lines.map((line, idx) => {
    // bullet lines
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-')
    const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line

    // bold formatting **text**
    const parts = cleanLine.split(/(\*\*.*?\*\*)/g)
    const content = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (isBullet) {
      return (
        <p key={idx} style={{ paddingLeft: '8px', margin: '4px 0' }}>
          • {content}
        </p>
      )
    }

    if (!line.trim()) {
      return <div key={idx} style={{ height: '6px' }} />
    }

    return <p key={idx}>{content}</p>
  })
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Hi there! 👋 I'm **Priyanshu's AI Assistant**.\n\nAsk me anything about Priyanshu's **projects**, **skills**, **LeetCode & GitHub activity**, **education**, or **work availability**!`,
      time: 'Just now',
      actions: [
        { label: '🚀 Top Projects', href: '#projects' },
        { label: '💼 Tech Stack', href: '#about' },
        { label: '📄 Resume', href: profile.resume, download: true },
      ],
    },
  ])

  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasOpenedOnce(true)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  const handleSend = (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || isTyping) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      time: now,
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate natural AI thinking delay
    setTimeout(() => {
      const resp = getBotResponse(query)
      const botMsg = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: resp.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: resp.actions,
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 450)
  }

  const handleActionClick = (e, action) => {
    if (action.href?.startsWith('#')) {
      e.preventDefault()
      const targetId = action.href.slice(1)
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleClear = () => {
    setMessages([
      {
        id: `w-${Date.now()}`,
        sender: 'bot',
        text: `Conversation cleared. What else would you like to know about Priyanshu?`,
        time: 'Just now',
        actions: [
          { label: '🚀 Top Projects', href: '#projects' },
          { label: '💻 LeetCode & GitHub', href: '#leetcode' },
          { label: '✉️ Contact', href: '#contact' },
        ],
      },
    ])
  }

  return (
    <>
      {/* Floating launcher trigger */}
      <div className="chat-launcher">
        {!isOpen && !hasOpenedOnce && (
          <div className="chat-launcher__nudge" onClick={() => setIsOpen(true)}>
            <span className="spark">✨</span> Ask Priyanshu’s AI
          </div>
        )}
        <button
          type="button"
          className="chat-launcher__btn"
          aria-label={isOpen ? 'Close chat' : 'Open AI chat assistant'}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <Icon name="close" size={22} /> : <Bot size={28} />}
          {!isOpen && <span className="chat-launcher__badge" />}
        </button>
      </div>

      {/* Floating Glassmorphic Chat Window */}
      <div className={`chat-window ${isOpen ? 'is-open' : ''}`} role="dialog" aria-label="AI Chat Assistant">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header__info">
            <div className="chat-header__avatar">
              <Bot size={26} />
              <span className="chat-header__status-dot" />
            </div>
            <div>
              <p className="chat-header__title">Priyanshu’s AI Agent</p>
              <p className="chat-header__sub">
                <span style={{ color: '#2bd67b', fontWeight: 'bold' }}>●</span> Online · Portfolio Guide
              </p>
            </div>
          </div>
          <div className="chat-header__actions">
            <button
              type="button"
              className="chat-btn-icon"
              title="Reset conversation"
              aria-label="Reset conversation"
              onClick={handleClear}
            >
              <Icon name="spark" size={16} />
            </button>
            <button
              type="button"
              className="chat-btn-icon"
              title="Close chat"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="chat-prompts">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chat-prompt-chip"
              onClick={() => handleSend(p.prompt)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="chat-messages" ref={scrollRef}>
          {messages.map((m) => (
            <div key={m.id} className={`chat-msg chat-msg--${m.sender}`}>
              <div className="chat-bubble">
                {formatMessageText(m.text)}

                {/* Optional Action Pills */}
                {m.actions?.length > 0 && (
                  <div className="chat-actions">
                    {m.actions.map((act) => (
                      <a
                        key={act.label}
                        href={act.href}
                        download={act.download || undefined}
                        target={act.external ? '_blank' : undefined}
                        rel={act.external ? 'noreferrer' : undefined}
                        className="chat-action-btn"
                        onClick={(e) => handleActionClick(e, act)}
                      >
                        {act.label}
                        {act.external ? <Icon name="external" size={12} /> : null}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="chat-msg__time">{m.time}</span>
            </div>
          ))}

          {isTyping && (
            <div className="chat-msg chat-msg--bot">
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Input Bar */}
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Ask about projects, skills, LeetCode..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </>
  )
}
