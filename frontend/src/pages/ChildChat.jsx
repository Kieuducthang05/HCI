import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { chatbotApi, getSelectedChild, preferencesApi, trackingApi } from '../services/api'
import '../styles/ChildChat.css'

import bunnyAvatar from '../assets/bunny-avatar.png'

const BunnyIcon = () => (
  <img 
    src={bunnyAvatar} 
    alt="Bunny Assistant" 
    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
  />
)

function formatParentAlertReason(alert) {
  const severity = alert.severity ? `Mức độ: ${alert.severity}` : ''
  const reason = alert.reason ? `Lý do: ${alert.reason}` : ''
  const childMessage = alert.child_message ? `Tin nhắn của trẻ: ${alert.child_message}` : ''

  return [severity, reason, childMessage].filter(Boolean).join(' | ').slice(0, 1000)
}

function formatRegulationAlertReason(alert, config, elapsedSeconds) {
  const baseReason = formatParentAlertReason(alert)
  const supportContact = config.contact ? `Người hỗ trợ: ${config.contact}` : ''
  const regulationMethod = `Điều hòa cảm xúc: mở Góc bình tĩnh cho trẻ`
  const elapsed = `Cảm xúc tiêu cực kéo dài: ${elapsedSeconds} giây`

  return [baseReason, elapsed, supportContact, regulationMethod].filter(Boolean).join(' | ').slice(0, 1000)
}

function normalizeRegulationConfig(value) {
  const rawAlertAfter = String(value?.alertAfter || '60')
  const alertAfter = ['60', '120'].includes(rawAlertAfter) ? rawAlertAfter : '60'

  return {
    method: ['breathing', 'quiet', 'music', 'parent'].includes(value?.method) ? value.method : 'breathing',
    contact: typeof value?.contact === 'string' && value.contact.trim() ? value.contact.trim() : 'Mẹ',
    alertAfter,
    quietMode: typeof value?.quietMode === 'boolean' ? value.quietMode : true,
  }
}

function getAlertThresholdMs(config) {
  const seconds = Number(config.alertAfter || 60)
  return Math.max(60, Number.isFinite(seconds) ? seconds : 60) * 1000
}

function buildChildProfile(child) {
  if (!child) return null

  const currentYear = new Date().getFullYear()
  const birthYear = Number(child.birth_year)
  const age = Number.isInteger(birthYear) && birthYear > 1900 ? currentYear - birthYear : undefined

  return {
    name: child.nickname || child.name || 'Bé',
    age,
  }
}

export default function ChildChat() {
  const navigate = useNavigate()
  const selectedChild = getSelectedChild()
  const childName = selectedChild?.nickname || selectedChild?.name || 'em'
  const [regulationConfig, setRegulationConfig] = useState(() => {
    return normalizeRegulationConfig(selectedChild?.preferences?.preferences?.regulation)
  })
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'thỏ',
      text: `Xin chào ${childName}! 😊 Mình là Thỏ. Hôm nay ${childName} muốn nói chuyện với Thỏ về điều gì?`,
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [conversationSummary, setConversationSummary] = useState('')
  const messagesEndRef = useRef(null)
  const negativeStateRef = useRef({
    since: null,
    timerId: null,
    latestAlert: null,
    alertSent: false,
  })
  const regulationConfigRef = useRef(regulationConfig)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    regulationConfigRef.current = regulationConfig
  }, [regulationConfig])

  useEffect(() => {
    if (!selectedChild?.id) return undefined

    let mounted = true
    preferencesApi.get(selectedChild.id)
      .then((result) => {
        if (!mounted) return
        setRegulationConfig(normalizeRegulationConfig(result.preferences?.preferences?.regulation))
      })
      .catch(() => {
        // Keep the default one-minute threshold if preferences cannot be loaded.
      })

    return () => {
      mounted = false
    }
  }, [selectedChild?.id])

  useEffect(() => {
    const negativeState = negativeStateRef.current

    return () => {
      if (negativeState.timerId) {
        window.clearTimeout(negativeState.timerId)
      }
    }
  }, [])

  const resetNegativeEmotionWatch = () => {
    const state = negativeStateRef.current
    if (state.timerId) {
      window.clearTimeout(state.timerId)
    }

    state.since = null
    state.timerId = null
    state.latestAlert = null
    state.alertSent = false
  }

  const openCalmCornerWithAlert = () => {
    const state = negativeStateRef.current
    if (state.alertSent || !state.latestAlert) return

    const config = regulationConfigRef.current
    const elapsedSeconds = Math.round((Date.now() - (state.since || Date.now())) / 1000)
    const alertReason = formatRegulationAlertReason(state.latestAlert, config, elapsedSeconds)
    state.alertSent = true

    if (selectedChild?.id) {
      trackingApi.createAlert(selectedChild.id, alertReason).catch((error) => {
        console.error('Could not record prolonged negative emotion alert:', error)
      })
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'thỏ',
        text: 'Thỏ sẽ mở Góc bình tĩnh để con hít thở chậm một chút nhé.',
        timestamp: new Date(),
      },
    ])

    window.setTimeout(() => {
      navigate('/child/calm-corner')
    }, 900)
  }

  const scheduleNegativeEmotionWatch = (alert) => {
    const state = negativeStateRef.current
    state.latestAlert = alert

    if (!state.since) {
      state.since = Date.now()
      state.alertSent = false
    }

    if (state.timerId || state.alertSent) return

    const thresholdMs = getAlertThresholdMs(regulationConfigRef.current)
    const elapsedMs = Date.now() - state.since
    const delayMs = Math.max(0, thresholdMs - elapsedMs)

    state.timerId = window.setTimeout(() => {
      state.timerId = null
      openCalmCornerWithAlert()
    }, delayMs)
  }

  const quickReplies = [
    '😊 Tôi vui vẻ',
    '😢 Tôi buồn',
    '😴 Tôi mệt mỏi',
    '🤔 Tôi bối rối'
  ]

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return

    const userText = inputValue.trim()
    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const result = await chatbotApi.chat({
        message: userText,
        history: chatHistory,
        conversationSummary,
        childProfile: buildChildProfile(selectedChild),
      })

      const bunnyResponse = {
        id: messages.length + 2,
        sender: 'thỏ',
        text: result.reply || 'Thỏ chưa nghĩ ra câu trả lời. Em thử nói lại nhé.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, bunnyResponse])
      setConversationSummary(result.conversation_summary || '')
      setChatHistory(prev => {
        const nextHistory = [
          ...prev,
          {
            user: userText,
            assistant: bunnyResponse.text,
          },
        ]

        return nextHistory.slice(-5)
      })

      if (result.parent_alert?.reason) {
        scheduleNegativeEmotionWatch(result.parent_alert)
      } else if (result.input_filter?.status === false) {
        resetNegativeEmotionWatch()
      }
    } catch (error) {
      console.error('Chatbot request failed:', error)
      setMessages(prev => [
        ...prev,
        {
          id: messages.length + 2,
          sender: 'thỏ',
          text: 'Thỏ chưa kết nối được máy chủ trò chuyện. Em thử lại sau nhé.',
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickReply = (reply) => {
    setInputValue(reply)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="child-chat-container">
      <div className="chat-header">
        <button className="back-btn" type="button" onClick={() => navigate('/child/home')}>
          <FiArrowLeft aria-hidden="true" />
          <span>Back</span>
        </button>
        <div className="chat-header-title">
          <div className="bunny-icon-header">
            <BunnyIcon />
          </div>
          <div className="chat-header-copy">
            <h2>Thỏ</h2>
            <p>Trợ lý ảo của em</p>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender === 'user' ? 'user-message' : 'bunny-message'}`}
          >
            {message.sender === 'thỏ' && (
              <div className="message-avatar bunny-avatar">
                <BunnyIcon />
              </div>
            )}
            <div className="message-content">
              <p className="message-text">{message.text}</p>
              {message.sender === 'user' && (
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message bunny-message loading-message">
            <div className="message-avatar bunny-avatar">
              <BunnyIcon />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-quick-replies">
        {quickReplies.map((reply, index) => (
          <button
            key={index}
            className="quick-reply-btn"
            onClick={() => handleQuickReply(reply)}
          >
            {reply}
          </button>
        ))}
      </div>

      <div className="chat-input-area">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nhập tin nhắn của em..."
          className="chat-input"
          rows="1"
        />
        <button
          className="send-btn"
          onClick={handleSendMessage}
          disabled={inputValue.trim() === '' || isLoading}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16585267 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.4429026 C0.994623095,2.07 0.837654326,3.0274447 1.15159189,3.81352132 L3.03521743,10.254514 C3.03521743,10.4116114 3.19218622,10.5687088 3.50612381,10.5687088 L16.6915026,11.3541957 C16.6915026,11.3541957 17.1624089,11.3541957 17.1624089,10.9415503 L17.1624089,11.8841346 C17.1624089,12.0412319 17.1624089,12.4744748 16.6915026,12.4744748 Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
