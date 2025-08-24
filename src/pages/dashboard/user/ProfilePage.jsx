import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Bell,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  Camera,
  Settings
} from 'lucide-react';
import authService, { validatePasswordStrength } from '@/services/auth';

export default function ProfilePage() {
  const { user, updateProfile, updatePassword, resendEmailVerification, checkEmailVerification } = useAuth();
  const { toast } = useToast();
  
  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '',
    phone: '',
    bio: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    sms_notifications: false,
    marketing_emails: false,
    profile_visibility: 'public'
  });
  
  // UI states
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    verification: false
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        full_name: user.full_name || '',
        phone: user.phone || '',
        bio: user.bio || ''
      });
      
      setPreferences({
        email_notifications: user.preferences?.email_notifications ?? true,
        sms_notifications: user.preferences?.sms_notifications ?? false,
        marketing_emails: user.preferences?.marketing_emails ?? false,
        profile_visibility: user.preferences?.profile_visibility || 'public'
      });
      
      setEmailVerified(user.email_verified || false);
    }
  }, [user]);

  // Handle password strength validation
  useEffect(() => {
    if (passwordForm.newPassword) {
      const validation = validatePasswordStrength(passwordForm.newPassword);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength(null);
    }
  }, [passwordForm.newPassword]);

  // Handle personal info update
  const handlePersonalInfoUpdate = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, profile: true }));
    
    try {
      await updateProfile({
        full_name: personalInfo.full_name,
        phone: personalInfo.phone,
        bio: personalInfo.bio,
        preferences: {
          ...user.preferences,
          ...preferences
        }
      });
      
      toast({
        title: "הפרופיל עודכן בהצלחה",
        description: "הפרטים האישיים שלך נשמרו במערכת",
      });
    } catch (error) {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: error.message || "אירעה שגיאה בעדכון הפרטים",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // Handle password update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "שגיאה בסיסמה",
        description: "הסיסמאות החדשות אינן תואמות",
        variant: "destructive",
      });
      return;
    }
    
    if (!passwordStrength?.isValid) {
      toast({
        title: "סיסמה חלשה",
        description: "הסיסמה החדשה אינה עומדת בדרישות האבטחה",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(prev => ({ ...prev, password: true }));
    
    try {
      await updatePassword(passwordForm.newPassword);
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast({
        title: "הסיסמה עודכנה בהצלחה",
        description: "הסיסמה החדשה נשמרה במערכת",
      });
    } catch (error) {
      toast({
        title: "שגיאה בעדכון הסיסמה",
        description: error.message || "אירעה שגיאה בעדכון הסיסמה",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  // Handle email verification resend
  const handleResendVerification = async () => {
    setLoading(prev => ({ ...prev, verification: true }));
    
    try {
      await resendEmailVerification();
      toast({
        title: "אימייל אימות נשלח",
        description: "בדוק את תיבת הדואר שלך לאימות החשבון",
      });
    } catch (error) {
      toast({
        title: "שגיאה בשליחת אימות",
        description: error.message || "אירעה שגיאה בשליחת אימייל האימות",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, verification: false }));
    }
  };

  // Handle email verification check
  const handleCheckVerification = async () => {
    setLoading(prev => ({ ...prev, verification: true }));
    
    try {
      const isVerified = await checkEmailVerification();
      setEmailVerified(isVerified);
      
      if (isVerified) {
        toast({
          title: "האימייל אומת בהצלחה",
          description: "החשבון שלך מאומת כעת",
        });
      } else {
        toast({
          title: "האימייל עדיין לא אומת",
          description: "אנא בדוק את תיבת הדואר שלך",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה בבדיקת אימות",
        description: error.message || "אירעה שגיאה בבדיקת סטטוס האימות",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, verification: false }));
    }
  };

  return (
    <div className="space-y-8 dashboard-minimal">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">פרופיל אישי</h1>
          <p className="text-gray-600">
            נהל את הפרטים האישיים שלך והגדרות החשבון
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-semibold">
              {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Professional Email Verification Alert */}
      {!emailVerified && (
        <Card className="dashboard-card bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">אימות אימייל נדרש</h3>
                <p className="text-amber-700 mb-4">
                  כתובת האימייל שלך טרם אומתה. אמת את האימייל כדי לקבל גישה מלאה לכל התכונות.
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCheckVerification}
                    disabled={loading.verification}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    בדוק אימות
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleResendVerification}
                    disabled={loading.verification}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    שלח אימייל שוב
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="personal" className="space-y-6 dashboard-animate-scale">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            פרטים אישיים
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            אבטחה
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            העדפות
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card className="dashboard-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                פרטים אישיים
              </CardTitle>
              <CardDescription className="text-gray-600">
                עדכן את הפרטים האישיים שלך ומידע הקשר
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePersonalInfoUpdate} className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-800 text-xl">
                      {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      שנה תמונה
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG או GIF. מקסימום 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">שם מלא</Label>
                    <Input
                      id="full_name"
                      value={personalInfo.full_name}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="הכנס שם מלא"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">כתובת אימייל</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <Badge variant={emailVerified ? "default" : "destructive"}>
                        {emailVerified ? "מאומת" : "לא מאומת"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="הכנס מספר טלפון"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">סוג חשבון</Label>
                    <Input
                      id="role"
                      value={user?.role === 'admin' ? 'מנהל' : 'משתמש'}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">אודות</Label>
                  <Textarea
                    id="bio"
                    value={personalInfo.bio}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="ספר קצת על עצמך..."
                    rows={3}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={loading.profile}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {loading.profile ? 'שומר...' : 'שמור שינויים'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="dashboard-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Key className="h-5 w-5 text-red-600" />
                </div>
                שינוי סיסמה
              </CardTitle>
              <CardDescription className="text-gray-600">
                עדכן את הסיסמה שלך לאבטחה מיטבית
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="הכנס סיסמה נוכחית"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">סיסמה חדשה</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="הכנס סיסמה חדשה"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {passwordStrength && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>חוזק הסיסמה:</span>
                        <span className={`font-medium ${
                          passwordStrength.strength >= 80 ? 'text-green-600' :
                          passwordStrength.strength >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {passwordStrength.message}
                        </span>
                      </div>
                      <Progress value={passwordStrength.strength} className="h-2" />
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          {passwordStrength.checks.length ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                          <span>לפחות 8 תווים</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordStrength.checks.uppercase ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                          <span>אות גדולה באנגלית</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordStrength.checks.lowercase ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                          <span>אות קטנה באנגלית</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordStrength.checks.number ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                          <span>מספר</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordStrength.checks.special ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                          <span>תו מיוחד</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">אישור סיסמה חדשה</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="הכנס שוב את הסיסמה החדשה"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Password Match Indicator */}
                  {passwordForm.confirmPassword && (
                    <div className="flex items-center gap-2 text-sm">
                      {passwordForm.newPassword === passwordForm.confirmPassword ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600">הסיסמאות תואמות</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-red-600">הסיסמאות אינן תואמות</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={loading.password || !passwordStrength?.isValid || passwordForm.newPassword !== passwordForm.confirmPassword}
                  className="flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  {loading.password ? 'מעדכן...' : 'עדכן סיסמה'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="dashboard-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Bell className="h-5 w-5 text-green-600" />
                </div>
                הגדרות התראות
              </CardTitle>
              <CardDescription className="text-gray-600">
                נהל את ההתראות וההודעות שאתה מקבל
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_notifications" className="text-sm font-medium">
                    התראות אימייל
                  </Label>
                  <p className="text-sm text-gray-600">קבל התראות על פעילות חשובה באימייל</p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, email_notifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms_notifications" className="text-sm font-medium">
                    התראות SMS
                  </Label>
                  <p className="text-sm text-gray-600">קבל התראות דחופות בהודעות טקסט</p>
                </div>
                <Switch
                  id="sms_notifications"
                  checked={preferences.sms_notifications}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, sms_notifications: checked }))}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing_emails" className="text-sm font-medium">
                    אימיילי שיווק
                  </Label>
                  <p className="text-sm text-gray-600">קבל עדכונים על מבצעים ותכונות חדשות</p>
                </div>
                <Switch
                  id="marketing_emails"
                  checked={preferences.marketing_emails}
                  onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, marketing_emails: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                פרטיות
              </CardTitle>
              <CardDescription className="text-gray-600">
                נהל את הגדרות הפרטיות של הפרופיל שלך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile_visibility" className="text-sm font-medium">
                    נראות פרופיל
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">בחר מי יכול לראות את הפרופיל שלך</p>
                  <select
                    id="profile_visibility"
                    value={preferences.profile_visibility}
                    onChange={(e) => setPreferences(prev => ({ ...prev, profile_visibility: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="public">ציבורי - כולם יכולים לראות</option>
                    <option value="registered">משתמשים רשומים בלבד</option>
                    <option value="private">פרטי - רק אני</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}