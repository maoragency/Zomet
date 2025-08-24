import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Smartphone, 
  Mail, 
  Lock,
  Activity,
  Eye,
  AlertCircle
} from 'lucide-react';

const SecurityDashboard = () => {
  const { user, getUserSecurityStatus, getRecentSecurityEvents, enableTwoFactor, disableTwoFactor } = useAuth();
  const [securityStatus, setSecurityStatus] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statusResult, eventsResult] = await Promise.all([
        getUserSecurityStatus(),
        getRecentSecurityEvents(5)
      ]);

      setSecurityStatus(statusResult);
      setRecentEvents(eventsResult || []);
    } catch (error) {
      console.error('Error loading security data:', error);
      setError('שגיאה בטעינת נתוני האבטחה');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    try {
      if (securityStatus?.twoFactorEnabled) {
        await disableTwoFactor();
      } else {
        await enableTwoFactor();
      }
      
      // Reload security status
      await loadSecurityData();
    } catch (error) {
      setError('שגיאה בעדכון הגדרות האבטחה');
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreText = (score) => {
    if (score >= 80) return 'מעולה';
    if (score >= 60) return 'טוב';
    if (score >= 40) return 'בינוני';
    return 'נמוך';
  };

  const formatEventAction = (action) => {
    const actionMap = {
      'signin_success': 'התחברות מוצלחת',
      'signin_failed': 'התחברות נכשלה',
      'signin_attempt': 'ניסיון התחברות',
      'signout': 'התנתקות',
      'password_update_success': 'עדכון סיסמה',
      'email_verification_resent': 'שליחת אימות אימייל',
      'two_factor_enabled': 'הפעלת אימות דו-שלבי',
      'two_factor_disabled': 'ביטול אימות דו-שלבי',
      'profile_updated': 'עדכון פרופיל'
    };
    
    return actionMap[action] || action;
  };

  const getEventIcon = (action) => {
    if (action.includes('signin')) return <Lock className="h-4 w-4" />;
    if (action.includes('password')) return <Shield className="h-4 w-4" />;
    if (action.includes('two_factor')) return <Smartphone className="h-4 w-4" />;
    if (action.includes('email')) return <Mail className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getEventColor = (action) => {
    if (action.includes('failed')) return 'text-red-600';
    if (action.includes('success')) return 'text-green-600';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">מרכז האבטחה</h2>
        <Button onClick={loadSecurityData} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          רענן
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
            <Shield className="h-5 w-5" />
            <span>ציון אבטחה</span>
          </CardTitle>
          <CardDescription>
            הערכת רמת האבטחה של החשבון שלכם
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">ציון כללי</span>
              <span className={`text-2xl font-bold ${getSecurityScoreColor(securityStatus?.securityScore || 0)}`}>
                {securityStatus?.securityScore || 0}/100
              </span>
            </div>
            <Progress 
              value={securityStatus?.securityScore || 0} 
              className="h-2"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">רמת אבטחה</span>
              <Badge variant={securityStatus?.securityScore >= 80 ? 'default' : securityStatus?.securityScore >= 60 ? 'secondary' : 'destructive'}>
                {getSecurityScoreText(securityStatus?.securityScore || 0)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
              <Mail className="h-5 w-5" />
              <span>אימות אימייל</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">סטטוס</span>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {securityStatus?.emailVerified ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">מאומת</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-600 font-medium">לא מאומת</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
              <Smartphone className="h-5 w-5" />
              <span>אימות דו-שלבי</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">סטטוס</span>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {securityStatus?.twoFactorEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">פעיל</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-yellow-600 font-medium">לא פעיל</span>
                    </>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleToggleTwoFactor}
                variant={securityStatus?.twoFactorEnabled ? "destructive" : "default"}
                size="sm"
                className="w-full"
              >
                {securityStatus?.twoFactorEnabled ? 'בטל אימות דו-שלבי' : 'הפעל אימות דו-שלבי'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
            <Activity className="h-5 w-5" />
            <span>סטטוס החשבון</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {securityStatus?.loginCount || 0}
              </div>
              <div className="text-sm text-gray-600">התחברויות</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {securityStatus?.failedLoginAttempts || 0}
              </div>
              <div className="text-sm text-gray-600">ניסיונות כושלים</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {securityStatus?.daysSinceLastLogin !== null ? securityStatus.daysSinceLastLogin : '-'}
              </div>
              <div className="text-sm text-gray-600">ימים מההתחברות האחרונה</div>
            </div>
          </div>

          {securityStatus?.accountLocked && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                החשבון נחסם זמנית עקב ניסיונות התחברות כושלים. 
                החסימה תבוטל ב-{new Date(securityStatus.lockedUntil).toLocaleString('he-IL')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 rtl:space-x-reverse">
            <Eye className="h-5 w-5" />
            <span>פעילות אבטחה אחרונה</span>
          </CardTitle>
          <CardDescription>
            5 האירועים האחרונים הקשורים לאבטחת החשבון
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className={getEventColor(event.action)}>
                      {getEventIcon(event.action)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {formatEventAction(event.action)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleString('he-IL')}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {new Date(event.timestamp).toLocaleTimeString('he-IL')}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>אין פעילות אבטחה אחרונה</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;