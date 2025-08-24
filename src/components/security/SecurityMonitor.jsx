/**
 * Security monitoring dashboard component
 * Provides real-time security event monitoring and suspicious activity detection
 */

import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  Lock, 
  Unlock,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Search,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  securityValidator,
  SECURITY_EVENTS,
  USER_ROLES 
} from '@/utils/security'
import { usePermissions } from './AccessControl'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

/**
 * Security metrics overview
 */
const SecurityMetrics = () => {
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    suspiciousUsers: 0,
    activeUsers: 0,
    failedLogins: 0,
    permissionDenials: 0
  })

  useEffect(() => {
    const updateMetrics = () => {
      const events = securityValidator.getSecurityEvents()
      const last24Hours = Date.now() - (24 * 60 * 60 * 1000)
      const recentEvents = events.filter(event => 
        new Date(event.timestamp).getTime() > last24Hours
      )

      const criticalEvents = recentEvents.filter(event => 
        [
          SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
          SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          SECURITY_EVENTS.ACCOUNT_LOCKED
        ].includes(event.type)
      ).length

      const failedLogins = recentEvents.filter(event => 
        event.type === SECURITY_EVENTS.LOGIN_FAILURE
      ).length

      const permissionDenials = recentEvents.filter(event => 
        event.type === SECURITY_EVENTS.PERMISSION_DENIED
      ).length

      // Get unique users with suspicious activity
      const suspiciousUserIds = new Set()
      recentEvents.forEach(event => {
        if (event.details.userId && 
            [SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, SECURITY_EVENTS.UNAUTHORIZED_ACCESS].includes(event.type)) {
          suspiciousUserIds.add(event.details.userId)
        }
      })

      setMetrics({
        totalEvents: recentEvents.length,
        criticalEvents,
        suspiciousUsers: suspiciousUserIds.size,
        activeUsers: 0, // Would be calculated from active sessions
        failedLogins,
        permissionDenials
      })
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const metricCards = [
    {
      title: 'אירועי אבטחה (24 שעות)',
      value: metrics.totalEvents,
      icon: Activity,
      color: 'text-blue-600'
    },
    {
      title: 'אירועים קריטיים',
      value: metrics.criticalEvents,
      icon: AlertTriangle,
      color: metrics.criticalEvents > 0 ? 'text-red-600' : 'text-green-600'
    },
    {
      title: 'משתמשים חשודים',
      value: metrics.suspiciousUsers,
      icon: Users,
      color: metrics.suspiciousUsers > 0 ? 'text-orange-600' : 'text-green-600'
    },
    {
      title: 'כשלי התחברות',
      value: metrics.failedLogins,
      icon: Lock,
      color: metrics.failedLogins > 5 ? 'text-red-600' : 'text-yellow-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </p>
                  <p className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
                <Icon className={`h-8 w-8 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * Security events list
 */
const SecurityEventsList = ({ 
  events, 
  onEventClick,
  showUserDetails = true 
}) => {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case SECURITY_EVENTS.LOGIN_SUCCESS:
        return <Unlock className="h-4 w-4 text-green-600" />
      case SECURITY_EVENTS.LOGIN_FAILURE:
        return <Lock className="h-4 w-4 text-red-600" />
      case SECURITY_EVENTS.PERMISSION_DENIED:
        return <Shield className="h-4 w-4 text-orange-600" />
      case SECURITY_EVENTS.UNAUTHORIZED_ACCESS:
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case SECURITY_EVENTS.SUSPICIOUS_ACTIVITY:
        return <Eye className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventSeverity = (eventType) => {
    const highSeverity = [
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS,
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
      SECURITY_EVENTS.ACCOUNT_LOCKED
    ]
    
    const mediumSeverity = [
      SECURITY_EVENTS.PERMISSION_DENIED,
      SECURITY_EVENTS.LOGIN_FAILURE
    ]

    if (highSeverity.includes(eventType)) return 'high'
    if (mediumSeverity.includes(eventType)) return 'medium'
    return 'low'
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getEventDescription = (event) => {
    const eventLabels = {
      [SECURITY_EVENTS.LOGIN_SUCCESS]: 'התחברות מוצלחת',
      [SECURITY_EVENTS.LOGIN_FAILURE]: 'כשל בהתחברות',
      [SECURITY_EVENTS.LOGOUT]: 'התנתקות',
      [SECURITY_EVENTS.PERMISSION_DENIED]: 'הרשאה נדחתה',
      [SECURITY_EVENTS.UNAUTHORIZED_ACCESS]: 'גישה לא מורשית',
      [SECURITY_EVENTS.SUSPICIOUS_ACTIVITY]: 'פעילות חשודה',
      [SECURITY_EVENTS.ROLE_CHANGE]: 'שינוי תפקיד',
      [SECURITY_EVENTS.ACCOUNT_LOCKED]: 'חשבון נחסם',
      [SECURITY_EVENTS.ACCOUNT_UNLOCKED]: 'חשבון שוחרר',
      [SECURITY_EVENTS.DATA_EXPORT]: 'ייצוא נתונים',
      [SECURITY_EVENTS.ADMIN_ACTION]: 'פעולת מנהל'
    }

    return eventLabels[event.type] || event.type
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        אין אירועי אבטחה להצגה
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => {
        const severity = getEventSeverity(event.type)
        const severityColor = getSeverityColor(severity)
        
        return (
          <Card 
            key={index}
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              severity === 'high' ? 'border-red-200' : ''
            }`}
            onClick={() => onEventClick?.(event)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 space-x-reverse mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {getEventDescription(event)}
                      </p>
                      <Badge className={`text-xs ${severityColor}`}>
                        {severity === 'high' ? 'גבוה' : severity === 'medium' ? 'בינוני' : 'נמוך'}
                      </Badge>
                    </div>
                    
                    {showUserDetails && event.details.userId && (
                      <p className="text-xs text-gray-600 mb-1">
                        משתמש: {event.details.userId}
                      </p>
                    )}
                    
                    {event.details.reason && (
                      <p className="text-xs text-gray-600 mb-1">
                        סיבה: {event.details.reason}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(event.timestamp), { 
                        addSuffix: true, 
                        locale: he 
                      })}
                    </p>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  {event.details.ipAddress || 'IP לא ידוע'}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * Suspicious activity detector
 */
const SuspiciousActivityDetector = () => {
  const [suspiciousUsers, setSuspiciousUsers] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeSuspiciousActivity = async () => {
    setIsAnalyzing(true)
    
    try {
      // Get all recent events
      const events = securityValidator.getSecurityEvents()
      const userIds = [...new Set(events.map(e => e.details.userId).filter(Boolean))]
      
      const suspicious = []
      
      for (const userId of userIds) {
        const analysis = securityValidator.detectSuspiciousActivity(userId)
        if (analysis.isSuspicious) {
          suspicious.push({
            userId,
            ...analysis
          })
        }
      }
      
      setSuspiciousUsers(suspicious)
    } catch (error) {
      console.error('Error analyzing suspicious activity:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    analyzeSuspiciousActivity()
    const interval = setInterval(analyzeSuspiciousActivity, 60000) // Analyze every minute
    
    return () => clearInterval(interval)
  }, [])

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <AlertTriangle className="h-5 w-5" />
              <span>זיהוי פעילות חשודה</span>
            </CardTitle>
            <CardDescription>
              ניתוח אוטומטי של דפוסי פעילות חשודים
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzeSuspiciousActivity}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {suspiciousUsers.length === 0 ? (
          <div className="text-center py-4 text-green-600">
            <Shield className="h-8 w-8 mx-auto mb-2" />
            <p>לא זוהתה פעילות חשודה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suspiciousUsers.map((user, index) => (
              <Alert key={index} className="border-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">משתמש: {user.userId}</span>
                      <Badge className={getRiskColor(user.riskLevel)}>
                        רמת סיכון: {user.riskLevel === 'high' ? 'גבוהה' : user.riskLevel === 'medium' ? 'בינונית' : 'נמוכה'}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">סיבות:</p>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {user.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {user.recommendations.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">המלצות:</p>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {user.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Main security monitor component
 */
const SecurityMonitor = () => {
  const { hasPermission } = usePermissions()
  const [events, setEvents] = useState([])
  const [filteredEvents, setFilteredEvents] = useState([])
  const [filters, setFilters] = useState({
    eventType: '',
    userId: '',
    timeRange: '24h',
    search: ''
  })
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Check permissions
  if (!hasPermission('VIEW_AUDIT_LOGS')) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          אין לך הרשאה לצפות במידע אבטחה
        </AlertDescription>
      </Alert>
    )
  }

  useEffect(() => {
    const loadEvents = () => {
      const allEvents = securityValidator.getSecurityEvents()
      setEvents(allEvents)
    }

    loadEvents()
    const interval = setInterval(loadEvents, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let filtered = [...events]

    // Apply filters
    if (filters.eventType) {
      filtered = filtered.filter(event => event.type === filters.eventType)
    }

    if (filters.userId) {
      filtered = filtered.filter(event => 
        event.details.userId?.includes(filters.userId)
      )
    }

    if (filters.timeRange) {
      const now = Date.now()
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      }
      
      const cutoff = now - timeRanges[filters.timeRange]
      filtered = filtered.filter(event => 
        new Date(event.timestamp).getTime() > cutoff
      )
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(event => 
        event.type.toLowerCase().includes(searchLower) ||
        event.details.reason?.toLowerCase().includes(searchLower) ||
        event.details.userId?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredEvents(filtered)
  }, [events, filters])

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `security-events-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מוניטור אבטחה</h1>
          <p className="text-gray-600">מעקב אחר אירועי אבטחה ופעילות חשודה</p>
        </div>
        <Button onClick={exportEvents} variant="outline">
          <Download className="h-4 w-4 ml-2" />
          ייצוא נתונים
        </Button>
      </div>

      <SecurityMetrics />

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">אירועי אבטחה</TabsTrigger>
          <TabsTrigger value="suspicious">פעילות חשודה</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סינון אירועים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">סוג אירוע</label>
                  <Select
                    value={filters.eventType}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="כל האירועים" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">כל האירועים</SelectItem>
                      {Object.values(SECURITY_EVENTS).map(eventType => (
                        <SelectItem key={eventType} value={eventType}>
                          {eventType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">טווח זמן</label>
                  <Select
                    value={filters.timeRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">שעה אחרונה</SelectItem>
                      <SelectItem value="24h">24 שעות אחרונות</SelectItem>
                      <SelectItem value="7d">7 ימים אחרונים</SelectItem>
                      <SelectItem value="30d">30 ימים אחרונים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">משתמש</label>
                  <Input
                    placeholder="ID משתמש"
                    value={filters.userId}
                    onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">חיפוש</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="חיפוש באירועים..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>אירועי אבטחה ({filteredEvents.length})</span>
                <Badge variant="outline">
                  מתעדכן כל 10 שניות
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SecurityEventsList 
                events={filteredEvents}
                onEventClick={setSelectedEvent}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspicious">
          <SuspiciousActivityDetector />
        </TabsContent>
      </Tabs>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>פרטי אירוע אבטחה</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">מידע כללי</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">סוג אירוע:</span> {selectedEvent.type}
                    </div>
                    <div>
                      <span className="font-medium">זמן:</span> {new Date(selectedEvent.timestamp).toLocaleString('he-IL')}
                    </div>
                    <div>
                      <span className="font-medium">כתובת IP:</span> {selectedEvent.details.ipAddress || 'לא ידוע'}
                    </div>
                    <div>
                      <span className="font-medium">מזהה משתמש:</span> {selectedEvent.details.userId || 'לא ידוע'}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">פרטים נוספים</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SecurityMonitor