import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Activity, 
  User, 
  Car, 
  MessageSquare, 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  RefreshCw,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

/**
 * Real-time activity feed component for admin dashboard
 */
export const RealTimeActivityFeed = ({ 
  maxItems = 20,
  showUserFilter = false,
  showActionFilter = true,
  autoScroll = true,
  height = "400px",
  className = ""
}) => {
  // State
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [users, setUsers] = useState([])

  // Load initial activities
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            *,
            users:user_id(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(maxItems)

        if (error) throw error

        const formattedActivities = data?.map(activity => ({
          id: activity.id,
          action: activity.action,
          resource_type: activity.resource_type,
          resource_id: activity.resource_id,
          details: activity.details,
          created_at: activity.created_at,
          user: activity.users ? {
            id: activity.users.id,
            name: activity.users.full_name || activity.users.email,
            email: activity.users.email,
            avatar: activity.users.avatar_url
          } : null
        })) || []

        setActivities(formattedActivities)
        setConnected(true)
      } catch (error) {
        console.error('Error loading activities:', error)
        setConnected(false)
      } finally {
        setLoading(false)
      }
    }

    loadActivities()

    // Set up real-time subscription
    const channel = supabase.channel('activity-feed')
    
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_logs' },
      async (payload) => {
        // Get user data for the new activity
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .eq('id', payload.new.user_id)
          .single()

        const newActivity = {
          id: payload.new.id,
          action: payload.new.action,
          resource_type: payload.new.resource_type,
          resource_id: payload.new.resource_id,
          details: payload.new.details,
          created_at: payload.new.created_at,
          user: userData ? {
            id: userData.id,
            name: userData.full_name || userData.email,
            email: userData.email,
            avatar: userData.avatar_url
          } : null
        }

        setActivities(prev => [newActivity, ...prev.slice(0, maxItems - 1)])
      }
    )

    const sub = channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED')
    })

    setSubscription(sub)

    return () => {
      if (sub) {
        sub.unsubscribe()
      }
    }
  }, [maxItems])

  // Load users for filter
  useEffect(() => {
    if (showUserFilter) {
      const loadUsers = async () => {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email')
          .order('full_name')
        
        setUsers(data || [])
      }
      
      loadUsers()
    }
  }, [showUserFilter])

  // Get activity icon
  const getActivityIcon = (action) => {
    switch (action) {
      case 'signin_success':
      case 'signup_success':
        return <User className="h-4 w-4 text-blue-600" />
      case 'vehicle_created':
      case 'vehicle_updated':
        return <Car className="h-4 w-4 text-green-600" />
      case 'message_sent':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'profile_updated':
        return <Edit className="h-4 w-4 text-orange-600" />
      case 'vehicle_deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />
      case 'admin_action':
        return <Shield className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  // Get activity description
  const getActivityDescription = (activity) => {
    const { action, details, resource_type } = activity
    
    switch (action) {
      case 'signin_success':
        return 'התחבר למערכת'
      case 'signup_success':
        return 'נרשם למערכת'
      case 'vehicle_created':
        return `יצר מודעה חדשה${details?.title ? ` - ${details.title}` : ''}`
      case 'vehicle_updated':
        return `עדכן מודעה${details?.title ? ` - ${details.title}` : ''}`
      case 'vehicle_deleted':
        return `מחק מודעה${details?.title ? ` - ${details.title}` : ''}`
      case 'message_sent':
        return `שלח הודעה${details?.subject ? ` - ${details.subject}` : ''}`
      case 'profile_updated':
        return 'עדכן פרופיל'
      case 'password_updated':
        return 'שינה סיסמה'
      case 'admin_action':
        return `פעולת מנהל - ${details?.action || 'לא ידוע'}`
      default:
        return action.replace('_', ' ')
    }
  }

  // Get activity color
  const getActivityColor = (action) => {
    switch (action) {
      case 'signin_success':
      case 'signup_success':
        return 'text-blue-600'
      case 'vehicle_created':
        return 'text-green-600'
      case 'vehicle_updated':
        return 'text-orange-600'
      case 'vehicle_deleted':
        return 'text-red-600'
      case 'message_sent':
        return 'text-purple-600'
      case 'admin_action':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'עכשיו'
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `לפני ${diffInDays} ימים`
    
    return format(date, 'dd/MM/yyyy HH:mm', { locale: he })
  }

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (actionFilter !== 'all' && activity.action !== actionFilter) return false
    if (userFilter !== 'all' && activity.user?.id !== userFilter) return false
    return true
  })

  // Get unique actions for filter
  const uniqueActions = [...new Set(activities.map(a => a.action))]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            פעילות בזמן אמת
            {connected && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showActionFilter && (
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הפעולות</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {showUserFilter && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המשתמשים</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Badge variant={connected ? "default" : "destructive"}>
            {connected ? 'מחובר' : 'לא מחובר'}
          </Badge>
          <span>•</span>
          <span>{filteredActivities.length} פעילויות</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea style={{ height }} className="px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">אין פעילות להצגה</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.user?.name || 'משתמש לא ידוע'}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTime(activity.created_at)}
                      </span>
                    </div>
                    
                    <p className={`text-sm ${getActivityColor(activity.action)} truncate`}>
                      {getActivityDescription(activity)}
                    </p>
                    
                    {activity.resource_type && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {activity.resource_type}
                        </Badge>
                        {activity.resource_id && (
                          <span className="text-xs text-gray-500">
                            ID: {activity.resource_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {activity.user?.avatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar} />
                      <AvatarFallback>
                        {activity.user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default RealTimeActivityFeed