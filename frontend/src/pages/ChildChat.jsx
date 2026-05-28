import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatbotApi, getSelectedChild, trackingApi } from '../services/api'
import '../styles/ChildChat.css'

const BunnyIcon = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M 40 55 C 32 15 45 15 48 35" fill="#FCA5B5" />
    <path d="M 60 55 C 68 15 55 15 52 35" fill="#FCA5B5" />
    <path d="M 42 50 C 37 25 43 23 46 35" fill="#FFFFFF" />
    <path d="M 58 50 C 63 25 57 23 54 35" fill="#FFFFFF" />
    <circle cx="50" cy="65" r="26" fill="#FCA5B5" />
    <path d="M 39 61 Q 43 56 46 61" fill="none" stroke="#5A4A4C" strokeWidth="3" strokeLinecap="round" />
    <path d="M 54 61 Q 58 56 61 61" fill="none" stroke="#5A4A4C" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="67" r="2.5" fill="#FFFFFF" />
    <path d="M 46 72 Q 50 76 54 72" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="36" cy="68" rx="4" ry="2.5" fill="#FFCADA" />
    <ellipse cx="64" cy="68" rx="4" ry="2.5" fill="#FFCADA" />
  </svg>
)

function formatParentAlertReason(alert) {
  const severity = alert.severity ? `Mức độ: ${alert.severity}` : ''
  const reason = alert.reason ? `Lý do: ${alert.reason}` : ''
  const childMessage = alert.child_message ? `Tin nhắn của trẻ: ${alert.child_message}` : ''

  return [severity, reason, childMessage].filter(Boolean).join(' | ').slice(0, 1000)
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
        const alertReason = formatParentAlertReason(result.parent_alert)
        if (selectedChild?.id) {
          trackingApi.createAlert(selectedChild.id, alertReason).catch((error) => {
            console.error('Could not record chatbot alert:', error)
          })
        }
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
        <button className="back-btn" onClick={() => navigate('/child/home')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Quay lại</span>
        </button>
        <div className="chat-header-title">
          <div className="bunny-icon-header">
            <BunnyIcon />
          </div>
          <div>
            <h2>Thỏ</h2>
            <p>Trợ lý ảo của em 🐰</p>
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
              <span className="message-time">
                {message.timestamp.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
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
