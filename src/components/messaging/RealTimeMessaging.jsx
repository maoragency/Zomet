import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRealTimeMessages } from '@/hooks/useRealTime'
import { messagingService } from '@/services/messaging'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { 
  Send, 
  Check, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Loader2,
  Phone,
  Video,
  MoreHorizontal
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { he } from 'date-fns/locale'

/**
 * Real-time messaging component with typing indicators, read receipts, and presence
 */
export const RealTimeMessaging = ({ 
  conversationId, 
  participant, 
  onClose,
  className = "" 
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const messageInputRef = useRef(null)
  
  // Real-time hooks
  const {
    newMessages,
    typingUsers,
    onlineUsers,
    sendTypingIndicator,
    updatePresence,
    clearNewMessages
  } = useRealTimeMessages()

  // State
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [subscription, setSubscription] = useState(null)

  // Load conversation messages
  useEffect(() => {
    if (!conversationId || !participant) return

    const loadMessages = async () => {
      setLoading(true)
      try {
        const response = await messagingService.getConversation(participant.id)
        if (response.success) {
          setMessages(response.data.messages || [])
        }
      } catch (error) {
        toast({
          title: "שגיאה בטעינת ההודעות",
          description: "לא ניתן לטעון את ההודעות",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversationId, participant, toast])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !participant) return

    const handleRealTimeUpdate = (payload) => {
      switch (payload.type) {
        case 'new_message':
          if (payload.new) {
            setMessages(prev => [...prev, payload.new])
            // Auto-mark as delivered if we're the recipient
            if (payload.new.recipient_id === user?.id) {
              messagingService.markAsDelivered(payload.new.id)
            }
          }
          break
        case 'read_receipt':
          if (payload.new && payload.old) {
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? payload.new : msg
            ))
          }
          break
        case 'typing_indicator':
          // Handled by useRealTimeMessages hook
          break
        default:
          break
      }
    }

    try {
      const sub = messagingService.subscribeToConversation(
        participant.id,
        handleRealTimeUpdate
      )
      setSubscription(sub)
      setConnectionStatus('connected')
    } catch (error) {
      setConnectionStatus('error')
      toast({
        title: "שגיאת חיבור",
        description: "לא ניתן להתחבר לשרת ההודעות",
        variant: "destructive"
      })
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [conversationId, participant, user, toast])

  // Handle new messages from real-time hook
  useEffect(() => {
    newMessages.forEach(message => {
      if (message.sender_id === participant?.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === message.id)) return prev
          return [...prev, message]
        })
      }
    })
    clearNewMessages()
  }, [newMessages, participant, clearNewMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Update presence on mount/unmount
  useEffect(() => {
    updatePresence(true)
    return () => updatePresence(false)
  }, [updatePresence])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle typing indicator
  const handleTyping = useCallback((value) => {
    setNewMessage(value)
    
    if (!isTyping && value.trim()) {
      setIsTyping(true)
      sendTypingIndicator(participant?.id, true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(participant?.id, false)
    }, 2000)
  }, [isTyping, participant, sendTypingIndicator])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !participant || loading) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setLoading(true)

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      sendTypingIndicator(participant.id, false)
    }

    try {
      const response = await messagingService.sendMessage({
        recipient_id: participant.id,
        content: messageContent,
        message_type: 'user'
      })

      if (response.success) {
        // Message will be added via real-time subscription
        toast({
          title: "הודעה נשלחה",
          description: "ההודעה נשלחה בהצלחה",
        })
      } else {
        throw new Error(response.error || 'Failed to send message')
      }
    } catch (error) {
      toast({
        title: "שגיאה בשליחת ההודעה",
        description: "לא ניתן לשלוח את ההודעה",
        variant: "destructive"
      })
      // Restore message content
      setNewMessage(messageContent)
    } finally {
      setLoading(false)
    }
  }

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Mark message as read
  const handleMarkAsRead = async (messageId) => {
    try {
      await messagingService.markAsRead(messageId)
    } catch (error) {
      // Silent fail for read receipts
    }
  }

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'אתמול'
    } else {
      return format(date, 'dd/MM')
    }
  }

  // Get message status icon
  const getMessageStatusIcon = (message) => {
    if (message.sender_id !== user?.id) return null

    switch (message.delivery_status) {
      case 'sent':
        return <Clock className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <Check className="h-3 w-3 text-gray-500" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  // Check if participant is typing
  const isParticipantTyping = typingUsers.has(participant?.id)
  const isParticipantOnline = onlineUsers.has(participant?.id)

  if (!participant) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">בחר שיחה כדי להתחיל</p>
      </div>
    )
  }

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback>
                  {participant.name?.charAt(0) || participant.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isParticipantOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900">
                {participant.name || participant.full_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {isParticipantTyping ? (
                  <span className="text-blue-600">כותב...</span>
                ) : (
                  <span>
                    {isParticipantOnline ? 'מחובר כעת' : 'לא מחובר'}
                  </span>
                )}
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px] p-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isCurrentUser = message.sender_id === user?.id
                const showAvatar = !isCurrentUser
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => {
                      if (!isCurrentUser && !message.is_read) {
                        handleMarkAsRead(message.id)
                      }
                    }}
                  >
                    <div className={`flex items-end gap-2 max-w-[70%] ${
                      isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                    }`}>
                      {showAvatar && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="text-xs">
                            {participant.name?.charAt(0) || participant.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div
                        className={`p-3 rounded-lg ${
                          isCurrentUser
                            ? 'bg-gradient-to-r from-blue-50 to-amber-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        <div className={`flex items-center gap-1 mt-1 text-xs ${
                          isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          <span>{formatMessageTime(message.created_at)}</span>
                          {getMessageStatusIcon(message)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Typing indicator */}
              {isParticipantTyping && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2 max-w-[70%]">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback className="text-xs">
                        {participant.name?.charAt(0) || participant.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Input
            ref={messageInputRef}
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="כתוב הודעה..."
            disabled={loading || connectionStatus !== 'connected'}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || loading || connectionStatus !== 'connected'}
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {connectionStatus !== 'connected' && (
          <div className="mt-2 text-xs text-center">
            <Badge variant={connectionStatus === 'connecting' ? 'secondary' : 'destructive'}>
              {connectionStatus === 'connecting' ? 'מתחבר...' : 'שגיאת חיבור'}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}

export default RealTimeMessaging