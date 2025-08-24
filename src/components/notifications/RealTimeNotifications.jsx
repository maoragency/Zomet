import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRealTimeNotifications } from '@/hooks/useRealTime'
import { realTimeNotificationsService } from '@/services/realTimeNotifications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { 
  Bell, 
  BellRing, 
  Check, 
  X, 
  Settings, 
  Filter,
  MessageSquare,
  Car,
  Star,
  AlertTriangle,
  Info,
  Trash2,
  CheckCircle
} from 'lucide-react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

/**
 * Real-time notifications component with queuing, batching, and priority handling
 */
export const RealTimeNotifications = ({ 
  className = "",
  showHeader = true,
  maxHeight = "400px",
  onNotificationClick,
  enableBrowserNotifications = true,
  enableSounds = true
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const notificationSoundRef = useRef(null)
  
  // Real-time notifications hook
  const {
    newNotifications,
    requestNotificationPermission,
    clearNewNotifications
  } = useRealTimeNotifications()

  // State
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [subscription, setSubscription] = useState(null)
  const [notificationQueue, setNotificationQueue] = useState([])
  const [batchedNotifications, setBatchedNotifications] = useState(new Map())

  // Notification type configurations
  const notificationTypes = {
    message: { 
      icon: MessageSquare, 
      color: 'bg-gradient-to-r from-blue-50 to-amber-500', 
      priority: 'high',
      sound: '/sounds/message.mp3'
    },
    system: { 
      icon: Settings, 
      color: 'bg-gray-500', 
      priority: 'medium',
      sound: '/sounds/system.mp3'
    },
    ad_inquiry: { 
      icon: Car, 
      color: 'bg-green-500', 
      priority: 'high',
      sound: '/sounds/notification.mp3'
    },
    ad_approved: { 
      icon: Check, 
      color: 'bg-green-600', 
      priority: 'medium',
      sound: '/sounds/success.mp3'
    },
    ad_rejected: { 
      icon: X, 
      color: 'bg-red-500', 
      priority: 'medium',
      sound: '/sounds/error.mp3'
    },
    promotion: { 
      icon: Star, 
      color: 'bg-purple-500', 
      priority: 'low',
      sound: '/sounds/notification.mp3'
    },
    alert: { 
      icon: AlertTriangle, 
      color: 'bg-orange-500', 
      priority: 'high',
      sound: '/sounds/alert.mp3'
    },
    info: { 
      icon: Info, 
      color: 'bg-blue-400', 
      priority: 'low',
      sound: '/sounds/notification.mp3'
    }
  }

  // Load notifications on mount
  useEffect(() => {
    if (!user) return

    loadNotifications()
    setupRealTimeSubscription()

    // Request notification permission
    if (enableBrowserNotifications) {
      requestNotificationPermission()
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [user, enableBrowserNotifications, requestNotificationPermission])

  // Handle new real-time notifications
  useEffect(() => {
    if (newNotifications.length > 0) {
      newNotifications.forEach(notification => {
        handleNewNotification(notification)
      })
      clearNewNotifications()
    }
  }, [newNotifications, clearNewNotifications])

  // Process notification queue with batching
  useEffect(() => {
    if (notificationQueue.length === 0) return

    const timer = setTimeout(() => {
      processBatchedNotifications()
    }, 1000) // 1 second batching delay

    return () => clearTimeout(timer)
  }, [notificationQueue])

  // Load notifications from database
  const loadNotifications = async () => {
    try {
      setLoading(true)
      // This would be replaced with actual notifications service call
      const mockNotifications = [
        {
          id: 'notif1',
          type: 'message',
          title: 'הודעה חדשה',
          content: 'יוסי כהן שלח לך הודעה חדשה',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          is_read: false,
          priority: 'high',
          related_id: 'conv1'
        },
        {
          id: 'notif2',
          type: 'ad_inquiry',
          title: 'פנייה חדשה למודעה',
          content: 'מישהו התעניין במודעה "וולוו FH16 2020"',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_read: false,
          priority: 'high',
          related_id: 'ad2'
        }
      ]
      setNotifications(mockNotifications)
    } catch (error) {
      toast({
        title: "שגיאה בטעינת ההתראות",
        description: "לא ניתן לטעון את ההתראות",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Setup real-time subscription
  const setupRealTimeSubscription = () => {
    try {
      const sub = realTimeNotificationsService.subscribeToNotifications(
        user.id,
        handleRealTimeNotification,
        {
          enableBrowserNotifications,
          enableSounds,
          onNotificationClick: handleNotificationClick,
          onStatusChange: (status) => {
          }
        }
      )
      setSubscription(sub)
    } catch (error) {
      console.error('Error setting up real-time notifications:', error)
    }
  }

  // Handle real-time notification events
  const handleRealTimeNotification = (event) => {
    switch (event.type) {
      case 'new_notification':
        handleNewNotification(event.notification)
        break
      case 'notification_batch':
        handleNotificationBatch(event.notifications, event.notificationType)
        break
      case 'notification_updated':
        handleNotificationUpdate(event.notification, event.old)
        break
      default:
        break
    }
  }

  // Handle new notification
  const handleNewNotification = (notification) => {
    // Add to notifications list
    setNotifications(prev => [notification, ...prev])

    // Add to queue for batching
    setNotificationQueue(prev => [...prev, notification])

    // Show immediate notification for high priority
    if (notification.priority === 'high') {
      showImmediateNotification(notification)
    }

    // Play sound
    if (enableSounds) {
      playNotificationSound(notification.type)
    }
  }

  // Handle notification batch
  const handleNotificationBatch = (notifications, type) => {
    setBatchedNotifications(prev => {
      const newMap = new Map(prev)
      newMap.set(type, notifications)
      return newMap
    })

    // Show batch notification
    if (enableBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`${notifications.length} התראות חדשות`, {
        body: `יש לך ${notifications.length} התראות חדשות מסוג ${getTypeDisplayName(type)}`,
        icon: '/favicon.ico',
        tag: `batch-${type}`
      })
    }
  }

  // Handle notification update
  const handleNotificationUpdate = (notification, old) => {
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? notification : n
    ))
  }

  // Process batched notifications
  const processBatchedNotifications = () => {
    const queue = [...notificationQueue]
    setNotificationQueue([])

    // Group by type and priority
    const groups = queue.reduce((acc, notif) => {
      const key = `${notif.type}-${notif.priority}`
      if (!acc[key]) acc[key] = []
      acc[key].push(notif)
      return acc
    }, {})

    // Process each group
    Object.entries(groups).forEach(([key, notifications]) => {
      const [type, priority] = key.split('-')
      
      if (notifications.length > 1) {
        // Show batch toast
        toast({
          title: `${notifications.length} התראות חדשות`,
          description: `יש לך ${notifications.length} התראות חדשות מסוג ${getTypeDisplayName(type)}`,
        })
      }
    })
  }

  // Show immediate notification
  const showImmediateNotification = (notification) => {
    toast({
      title: notification.title,
      description: notification.content,
      action: notification.related_id ? (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleNotificationClick?.(notification)}
        >
          צפה
        </Button>
      ) : undefined
    })
  }

  // Play notification sound
  const playNotificationSound = (type) => {
    try {
      const config = notificationTypes[type] || notificationTypes.info
      const audio = new Audio(config.sound)
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore audio play errors
      })
    } catch (error) {
      // Ignore audio errors
    }
  }

  // Get type display name
  const getTypeDisplayName = (type) => {
    const typeNames = {
      message: 'הודעות',
      system: 'מערכת',
      ad_inquiry: 'פניות למודעות',
      ad_approved: 'אישור מודעות',
      ad_rejected: 'דחיית מודעות',
      promotion: 'קידום מודעות',
      alert: 'התראות',
      info: 'מידע'
    }
    return typeNames[type] || type
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    markAsRead(notification.id)
    
    // Call external handler
    onNotificationClick?.(notification)
  }

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await realTimeNotificationsService.markAsRead(notificationId)
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
      if (unreadIds.length === 0) return

      await realTimeNotificationsService.markMultipleAsRead(unreadIds)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      
      toast({
        title: "הסומן כנקרא",
        description: `${unreadIds.length} התראות סומנו כנקראו`,
      })
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לסמן את ההתראות כנקראו",
        variant: "destructive"
      })
    }
  }

  // Format notification time
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'אתמול'
    } else {
      return formatDistanceToNow(date, { addSuffix: true, locale: he })
    }
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.is_read) return false
    if (filter !== 'all' && filter !== 'unread' && notification.type !== filter) return false
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              התראות
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <MarkAsRead className="h-4 w-4" />
              </Button>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">הכל</option>
                <option value="unread">לא נקראו</option>
                <option value="message">הודעות</option>
                <option value="system">מערכת</option>
                <option value="ad_inquiry">פניות</option>
                <option value="promotion">קידום</option>
              </select>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">אין התראות להצגה</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => {
                const config = notificationTypes[notification.type] || notificationTypes.info
                const NotificationIcon = config.icon
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                      !notification.is_read ? 'bg-gradient-to-r from-blue-50 to-amber-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg text-white ${config.color}`}>
                        <NotificationIcon className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm ${
                            !notification.is_read ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                            {notification.priority === 'high' && (
                              <Badge variant="destructive" className="text-xs">
                                דחוף
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.content}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {getTypeDisplayName(notification.type)}
                          </Badge>
                          
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-50 to-amber-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default RealTimeNotifications