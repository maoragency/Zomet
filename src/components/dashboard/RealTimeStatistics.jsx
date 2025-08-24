import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Car, 
  MessageSquare, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react'

/**
 * Real-time statistics component for dashboard
 */
export const RealTimeStatistics = ({ 
  className = "",
  refreshInterval = 30000,
  showTrends = true,
  showConnectionStatus = true
}) => {
  // State
  const [statistics, setStatistics] = useState({
    users: { total: 0, active: 0, new_today: 0 },
    vehicles: { total: 0, active: 0, new_today: 0 },
    messages: { total: 0, unread: 0, today: 0 },
    activity: { total_today: 0, unique_users_today: 0 }
  })
  const [previousStats, setPreviousStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [subscription, setSubscription] = useState(null)

  // Load real statistics
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true)
        
        // Get real statistics from Supabase
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get user statistics
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, is_active, created_at')

        // Get vehicle statistics
        const { data: vehicles, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('id, status, created_at')

        // Get message statistics
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, is_read, created_at')

        // Get activity statistics
        const { data: activities, error: activitiesError } = await supabase
          .from('activity_logs')
          .select('id, user_id, created_at')
          .gte('created_at', today.toISOString())

        if (!usersError && !vehiclesError && !messagesError && !activitiesError) {
          const newUsersToday = users?.filter(u => new Date(u.created_at) >= today).length || 0
          const newVehiclesToday = vehicles?.filter(v => new Date(v.created_at) >= today).length || 0
          const messagesToday = messages?.filter(m => new Date(m.created_at) >= today).length || 0
          const uniqueUsersToday = new Set(activities?.map(a => a.user_id)).size || 0

          const newStats = {
            users: {
              total: users?.length || 0,
              active: users?.filter(u => u.is_active).length || 0,
              new_today: newUsersToday
            },
            vehicles: {
              total: vehicles?.length || 0,
              active: vehicles?.filter(v => v.status === 'למכירה').length || 0,
              new_today: newVehiclesToday
            },
            messages: {
              total: messages?.length || 0,
              unread: messages?.filter(m => !m.is_read).length || 0,
              today: messagesToday
            },
            activity: {
              total_today: activities?.length || 0,
              unique_users_today: uniqueUsersToday
            }
          }

          setPreviousStats(statistics)
          setStatistics(newStats)
          setConnected(true)
        }
      } catch (error) {
        console.error('Error loading statistics:', error)
        setConnected(false)
      } finally {
        setLoading(false)
        setLastUpdate(new Date())
      }
    }

    loadStatistics()

    // Set up real-time subscription for updates
    const channel = supabase.channel('statistics-updates')
    
    // Listen for user changes
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, loadStatistics)
    
    // Listen for vehicle changes
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, loadStatistics)
    
    // Listen for message changes
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadStatistics)
    
    // Listen for activity changes
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, loadStatistics)

    const subscription = channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED')
    })

    setSubscription(subscription)

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // Periodic refresh fallback
  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(async () => {
      try {
        // Reload statistics periodically
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const { data: users } = await supabase.from('users').select('id, is_active, created_at')
        const { data: vehicles } = await supabase.from('vehicles').select('id, status, created_at')
        const { data: messages } = await supabase.from('messages').select('id, is_read, created_at')
        const { data: activities } = await supabase.from('activity_logs').select('id, user_id, created_at').gte('created_at', today.toISOString())

        if (users && vehicles && messages) {
          const newUsersToday = users.filter(u => new Date(u.created_at) >= today).length
          const newVehiclesToday = vehicles.filter(v => new Date(v.created_at) >= today).length
          const messagesToday = messages.filter(m => new Date(m.created_at) >= today).length
          const uniqueUsersToday = new Set(activities?.map(a => a.user_id)).size

          const newStats = {
            users: {
              total: users.length,
              active: users.filter(u => u.is_active).length,
              new_today: newUsersToday
            },
            vehicles: {
              total: vehicles.length,
              active: vehicles.filter(v => v.status === 'למכירה').length,
              new_today: newVehiclesToday
            },
            messages: {
              total: messages.length,
              unread: messages.filter(m => !m.is_read).length,
              today: messagesToday
            },
            activity: {
              total_today: activities?.length || 0,
              unique_users_today: uniqueUsersToday
            }
          }

          setPreviousStats(statistics)
          setStatistics(newStats)
          setLastUpdate(new Date())
        }
      } catch (error) {
        console.error('Error refreshing statistics:', error)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  // Calculate trend for a metric
  const getTrend = (current, previous) => {
    if (!previous || !showTrends) return null
    
    const diff = current - previous
    if (diff > 0) return { direction: 'up', value: diff }
    if (diff < 0) return { direction: 'down', value: Math.abs(diff) }
    return { direction: 'same', value: 0 }
  }

  // Render trend indicator
  const renderTrend = (trend) => {
    if (!trend) return null

    const TrendIcon = trend.direction === 'up' ? TrendingUp : 
                     trend.direction === 'down' ? TrendingDown : Minus

    const colorClass = trend.direction === 'up' ? 'text-green-600' :
                      trend.direction === 'down' ? 'text-red-600' : 'text-gray-400'

    return (
      <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
        <TrendIcon className="h-3 w-3" />
        {trend.value > 0 && <span>{trend.value}</span>}
      </div>
    )
  }

  // Statistics cards configuration
  const statsCards = [
    {
      title: 'משתמשים',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-r from-blue-50 to-amber-50',
      metrics: [
        { 
          label: 'סה"כ', 
          value: statistics.users.total,
          trend: getTrend(statistics.users.total, previousStats?.users.total)
        },
        { 
          label: 'פעילים', 
          value: statistics.users.active,
          trend: getTrend(statistics.users.active, previousStats?.users.active)
        },
        { 
          label: 'חדשים היום', 
          value: statistics.users.new_today,
          trend: getTrend(statistics.users.new_today, previousStats?.users.new_today)
        }
      ]
    },
    {
      title: 'רכבים',
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      metrics: [
        { 
          label: 'סה"כ', 
          value: statistics.vehicles.total,
          trend: getTrend(statistics.vehicles.total, previousStats?.vehicles.total)
        },
        { 
          label: 'פעילים', 
          value: statistics.vehicles.active,
          trend: getTrend(statistics.vehicles.active, previousStats?.vehicles.active)
        },
        { 
          label: 'חדשים היום', 
          value: statistics.vehicles.new_today,
          trend: getTrend(statistics.vehicles.new_today, previousStats?.vehicles.new_today)
        }
      ]
    },
    {
      title: 'הודעות',
      icon: MessageSquare,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      metrics: [
        { 
          label: 'סה"כ', 
          value: statistics.messages.total,
          trend: getTrend(statistics.messages.total, previousStats?.messages.total)
        },
        { 
          label: 'לא נקראו', 
          value: statistics.messages.unread,
          trend: getTrend(statistics.messages.unread, previousStats?.messages.unread)
        },
        { 
          label: 'היום', 
          value: statistics.messages.today,
          trend: getTrend(statistics.messages.today, previousStats?.messages.today)
        }
      ]
    },
    {
      title: 'פעילות',
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      metrics: [
        { 
          label: 'פעולות היום', 
          value: statistics.activity.total_today,
          trend: getTrend(statistics.activity.total_today, previousStats?.activity.total_today)
        },
        { 
          label: 'משתמשים פעילים', 
          value: statistics.activity.unique_users_today,
          trend: getTrend(statistics.activity.unique_users_today, previousStats?.activity.unique_users_today)
        }
      ]
    }
  ]

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">מחובר לזמן אמת</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">לא מחובר</span>
              </>
            )}
          </div>
          
          {lastUpdate && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <RefreshCw className="h-3 w-3" />
              עודכן: {lastUpdate.toLocaleTimeString('he-IL')}
            </div>
          )}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => {
          const Icon = card.icon
          
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>{card.title}</span>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {card.metrics.map((metric, metricIndex) => (
                    <div key={metricIndex} className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {metric.value.toLocaleString('he-IL')}
                        </div>
                        <div className="text-xs text-gray-600">
                          {metric.label}
                        </div>
                      </div>
                      {renderTrend(metric.trend)}
                    </div>
                  ))}
                </div>
              </CardContent>
              
              {/* Real-time indicator */}
              {connected && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default RealTimeStatistics