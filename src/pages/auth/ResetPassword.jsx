import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, Check, X, Shield, KeyRound, ArrowRight, Car } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isValidToken, setIsValidToken] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Check for reset token in URL
  useEffect(() => {
    const checkResetToken = async () => {
      const urlParams = new URLSearchParams(location.search);
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const type = urlParams.get('type');
      
      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) throw error;
          
          setIsValidToken(true);
          
          // Clean the URL
          navigate(location.pathname, { replace: true });
          
        } catch (error) {
          console.error('Invalid reset token:', error);
          setIsValidToken(false);
          setError('קישור האיפוס לא תקין או פג תוקפו');
        }
      } else {
        setIsValidToken(false);
        setError('קישור האיפוס לא תקין או חסר');
      }
    };
    
    checkResetToken();
  }, [location, navigate]);

  // Redirect if already logged in (but not during password reset)
  useEffect(() => {
    if (user && !loading && isValidToken === false) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [user, loading, navigate, isValidToken]);

  // Password strength validation
  useEffect(() => {
    const password = formData.password;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    setPasswordChecks(checks);
    
    const strength = Object.values(checks).filter(Boolean).length;
    setPasswordStrength((strength / 5) * 100);
  }, [formData.password]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('נדרשת סיסמה חדשה');
      return false;
    }
    
    if (passwordStrength < 60) {
      setError('הסיסמה חלשה מדי. אנא בחר סיסמה חזקה יותר');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });
      
      if (error) throw error;
      
      setSuccess('הסיסמה עודכנה בהצלחה!');
      
      // Redirect to login after success
      setTimeout(() => {
        navigate(createPageUrl('Login') + '?message=' + encodeURIComponent('הסיסמה עודכנה בהצלחה! אנא התחבר עם הסיסמה החדשה') + '&type=success');
      }, 2000);
      
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('New password should be different')) {
        setError('הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת');
      } else if (error.message?.includes('Password should be at least')) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      } else if (error.message?.includes('Unable to validate email address')) {
        setError('קישור האיפוס פג תוקפו. אנא בקש קישור חדש');
      } else {
        setError('שגיאה בעדכון הסיסמה. אנא נסה שוב');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 20) return 'חלשה מאוד';
    if (passwordStrength < 40) return 'חלשה';
    if (passwordStrength < 60) return 'בינונית';
    if (passwordStrength < 80) return 'חזקה';
    return 'חזקה מאוד';
  };

  if (loading || isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">מאמת קישור...</span>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-red-600">קישור לא תקין</CardTitle>
              <CardDescription className="text-center">
                קישור האיפוס לא תקין או פג תוקפו
              </CardDescription>
            </CardHeader>
            
            <CardContent className="text-center space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl('ForgotPassword'))}
                  className="w-full"
                >
                  בקש קישור חדש
                </Button>
                
                <Button
                  onClick={() => navigate(createPageUrl('Login'))}
                  variant="outline"
                  className="w-full"
                >
                  חזור להתחברות
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-6">
            <div className="bg-green-600 rounded-2xl p-3">
              <Car className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">צומת</h1>
              <p className="text-gray-600 text-sm">מרכז הרכב הישראלי</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <KeyRound className="h-3 w-3 mr-1" />
              איפוס סיסמה מאובטח
            </Badge>
          </div>
          
          <div className="bg-green-50 rounded-2xl p-4 mb-6">
            <Shield className="mx-auto h-12 w-12 text-green-600 mb-2" />
            <h2 className="text-3xl font-bold text-gray-900">
              איפוס סיסמה
            </h2>
            <p className="mt-2 text-gray-600">
              הזינו סיסמה חדשה וחזקה לחשבון שלכם
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              סיסמה חדשה
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              בחרו סיסמה חזקה ובטוחה
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה חדשה</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="הזן סיסמה חדשה"
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>חוזק הסיסמה:</span>
                      <span className={`font-medium ${passwordStrength < 60 ? 'text-red-600' : 'text-green-600'}`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <Progress value={passwordStrength} className="h-2" />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center ${passwordChecks.length ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordChecks.length ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        8+ תווים
                      </div>
                      <div className={`flex items-center ${passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordChecks.uppercase ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        אות גדולה
                      </div>
                      <div className={`flex items-center ${passwordChecks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordChecks.lowercase ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        אות קטנה
                      </div>
                      <div className={`flex items-center ${passwordChecks.number ? 'text-green-600' : 'text-gray-400'}`}>
                        {passwordChecks.number ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        מספר
                      </div>
                      <div className={`flex items-center ${passwordChecks.special ? 'text-green-600' : 'text-gray-400'} col-span-2`}>
                        {passwordChecks.special ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        תו מיוחד (!@#$%^&*)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="הזן סיסמה שוב"
                    className="pl-10 pr-10"
                    required
                    autoComplete="new-password"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-600">הסיסמאות אינן תואמות</p>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-amber-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">טיפים לסיסמה בטוחה:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• השתמש בשילוב של אותיות גדולות וקטנות</li>
                  <li>• הוסף מספרים ותווים מיוחדים</li>
                  <li>• אל תשתמש במידע אישי כמו תאריכי לידה</li>
                  <li>• אל תשתמש באותה סיסמה באתרים אחרים</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                disabled={isSubmitting || passwordStrength < 60}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    מעדכן סיסמה...
                  </>
                ) : (
                  <>
                    עדכנו סיסמה
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to={createPageUrl('Login')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                חזור להתחברות
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            to={createPageUrl('Home')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← חזור לעמוד הבית
          </Link>
        </div>
      </div>
    </div>
  );
}