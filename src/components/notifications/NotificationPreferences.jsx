import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { realTimeNotificationsService } from '@/services/realTimeNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Bell, 
  Mail, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Clock,
  MessageSquare,
  Car,
  Star,
  Settings,
  Save,
  TestTube
} from 'lucide-react'

/**
 * Notification preferences management component
 */
export const NotificationPreferences = ({ 
  className = "",
  onSave,
  showTestButtons = true 
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  // State
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    browser_notifications: true,
    sound_notifications: true,
    message_notifications: true,
    system_notifications: true,
    ad_notifications: true,
    promotion_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [browserPermission, setBrowserPermission] = useState('default')

  // Load preferences on mount
  useEffect(() => {
    if (!user) return
    loadPreferences()
    checkBrowserPermission()
  }, [user])

  // Load user preferences
  const loadPreferences = async () => {
    try {
      setLoading(true)
      const response = await realTimeNotificationsService.getNotificationPreferences(user.id)
      if (response.success) {
        setPreferences(response.data)
      }
    } catch (error) {
      toast({
        title: "שגיאה בטעינת ההעדפות",
        description: "לא ניתן לטעון את העדפות ההתראות",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Check browser notification permission
  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true)
      const response = await realTimeNotificationsService.updateNotificationPreferences(
        user.id, 
        preferences
      )
      
      if (response.success) {
        toast({
          title: "העדפות נשמרו",
          description: "העדפות ההתראות עודכנו בהצלחה",
        })
        onSave?.(preferences)
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      toast({
        title: "שגיאה בשמירת ההעדפות",
        description: "לא ניתן לשמור את העדפות ההתראות",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Request browser notification permission
  const requestBrowserPermission = async () => {
    try {
      const granted = await realTimeNotificationsService.requestNotificationPermission()
      setBrowserPermission(granted ? 'granted' : 'denied')
      
      if (granted) {
        toast({
          title: "הרשאה ניתנה",
          description: "התראות דפדפן הופעלו בהצלחה",
        })
      } else {
        toast({
          title: "הרשאה נדחתה",
          description: "לא ניתן להפעיל התראות דפדפן",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה בבקשת הרשאה",
        description: "לא ניתן לבקש הרשאה להתראות",
        variant: "destructive"
      })
    }
  }

  // Test notification
  const testNotification = async (type) => {
    try {
      const testNotifications = {
        message: {
          title: 'הודעה לדוגמה',
          content: 'זוהי הודעה לדוגמה לבדיקת ההתראות',
          type: 'message',
          priority: 'high'
        },
        system: {
          title: 'התראת מערכת',
          content: 'זוהי התראת מערכת לדוגמה',
          type: 'system',
          priority: 'medium'
        },
        ad_inquiry: {
          title: 'פנייה למודעה',
          content: 'מישהו התעניין במודעה שלך',
          type: 'ad_inquiry',
          priority: 'high'
        },
        promotion: {
          title: 'קידום מודעה',
          content: 'המודעה שלך קודמה בהצלחה',
          type: 'promotion',
          priority: 'low'
        }
      }

      const notification = testNotifications[type]
      await realTimeNotificationsService.sendNotification(user.id, notification)
      
      toast({
        title: "התראה נשלחה",
        description: "התראה לדוגמה נשלחה בהצלחה",
      })
    } catch (error) {
      toast({
        title: "שגיאה בשליחת התראה",
        description: "לא ניתן לשלוח התראה לדוגמה",
        variant: "destructive"
      })
    }
  }

  // Update preference
  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Get permission badge
  const getPermissionBadge = () => {
    switch (browserPermission) {
      case 'granted':
        return <Badge className="bg-green-500">מופעל</Badge>
      case 'denied':
        return <Badge variant="destructive">נדחה</Badge>
      default:
        return <Badge variant="secondary">לא נבקש</Badge>
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          העדפות התראות
        </CardTitle>
        <CardDescription>
          נהל את הגדרות ההתראות וההודעות שלך
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">אמצעי מסירה</h3>
          
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-600" />
              <div>
                <Label>התראות אימייל</Label>
                <p className="text-sm text-gray-600">קבל התראות על הודעות חדשות באימייל</p>
              </div>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
            />
          </div>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-gray-600" />
              <div>
                <Label>התראות דפדפן</Label>
                <p className="text-sm text-gray-600">קבל התראות דחיפה בדפדפן</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">סטטוס:</span>
                  {getPermissionBadge()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {browserPermission !== 'granted' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestBrowserPermission}
                >
                  בקש הרשאה
                </Button>
              )}
              <Switch
                checked={preferences.browser_notifications && browserPermission === 'granted'}
                onCheckedChange={(checked) => updatePreference('browser_notifications', checked)}
                disabled={browserPermission !== 'granted'}
              />
            </div>
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {preferences.sound_notifications ? (
                <Volume2 className="h-5 w-5 text-gray-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-600" />
              )}
              <div>
                <Label>צלילי התראות</Label>
                <p className="text-sm text-gray-600">השמע צליל כשמגיעה התראה חדשה</p>
              </div>
            </div>
            <Switch
              checked={preferences.sound_notifications}
              onCheckedChange={(checked) => updatePreference('sound_notifications', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">סוגי התראות</h3>
          
          {/* Message Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <Label>הודעות</Label>
                <p className="text-sm text-gray-600">התראות על הודעות חדשות</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showTestButtons && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('message')}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              )}
              <Switch
                checked={preferences.message_notifications}
                onCheckedChange={(checked) => updatePreference('message_notifications', checked)}
              />
            </div>
          </div>

          {/* System Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-600" />
              <div>
                <Label>מערכת</Label>
                <p className="text-sm text-gray-600">התראות מערכת ועדכונים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showTestButtons && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('system')}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              )}
              <Switch
                checked={preferences.system_notifications}
                onCheckedChange={(checked) => updatePreference('system_notifications', checked)}
              />
            </div>
          </div>

          {/* Ad Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-green-600" />
              <div>
                <Label>מודעות</Label>
                <p className="text-sm text-gray-600">התראות על פניות למודעות ואישורים</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showTestButtons && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('ad_inquiry')}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              )}
              <Switch
                checked={preferences.ad_notifications}
                onCheckedChange={(checked) => updatePreference('ad_notifications', checked)}
              />
            </div>
          </div>

          {/* Promotion Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-purple-600" />
              <div>
                <Label>קידום מודעות</Label>
                <p className="text-sm text-gray-600">התראות על קידום מודעות והצעות</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showTestButtons && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('promotion')}
                >
                  <TestTube className="h-4 w-4" />
                </Button>
              )}
              <Switch
                checked={preferences.promotion_notifications}
                onCheckedChange={(checked) => updatePreference('promotion_notifications', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <div>
                <Label>שעות שקט</Label>
                <p className="text-sm text-gray-600">השתק התראות בשעות מסוימות</p>
              </div>
            </div>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 ml-8">
              <div>
                <Label className="text-sm">שעת התחלה</Label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <Label className="text-sm">שעת סיום</Label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            שמור הגדרות
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default NotificationPreferences