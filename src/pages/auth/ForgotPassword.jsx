import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Clock, Shield, KeyRound, Car } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, user, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [user, loading, navigate]);

  // Pre-fill email if passed from login page
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  // Countdown timer for resend button
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validateEmail = (email) => {
    if (!email.trim()) {
      setError('נדרש כתובת אימייל');
      return false;
    }
    
    if (!email.includes('@')) {
      setError('כתובת אימייל לא תקינה');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('כתובת אימייל לא תקינה');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(email)) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await resetPassword(email);
      
      setSuccess('נשלח אליך אימייל עם קישור לאיפוס הסיסמה');
      setEmailSent(true);
      setCountdown(60); // 60 seconds cooldown
      
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('User not found')) {
        setError('כתובת האימייל לא נמצאה במערכת');
      } else if (error.message?.includes('Email rate limit exceeded')) {
        setError('נשלחו יותר מדי בקשות. אנא נסה שוב מאוחר יותר');
      } else {
        setError('שגיאה בשליחת אימייל. אנא נסה שוב');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await resetPassword(email);
      setSuccess('נשלח שוב אימייל עם קישור לאיפוס הסיסמה');
      setCountdown(60);
    } catch (error) {
      setError('שגיאה בשליחת אימייל. אנא נסה שוב');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate(createPageUrl('Login'), {
      state: { email: email }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">טוען...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-6">
            <div className="bg-blue-600 rounded-2xl p-3">
              <Car className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">צומת</h1>
              <p className="text-gray-600 text-sm">מרכז הרכב הישראלי</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-amber-50 text-blue-700 border-blue-200">
              <KeyRound className="h-3 w-3 mr-1" />
              איפוס סיסמה מאובטח
            </Badge>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900">
            שכחתם סיסמה?
          </h2>
          <p className="mt-2 text-gray-600">
            אל תדאגו, נשלח לכם קישור לאיפוס הסיסמה
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">
              איפוס סיסמה
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {emailSent 
                ? 'בדקו את תיבת הדואר שלכם'
                : 'הזינו את כתובת האימייל שלכם'
              }
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

            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    כתובת אימייל
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="example@email.com"
                      className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                      required
                      autoComplete="email"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Shield className="h-3 w-3 mr-1" />
                    נשלח אליכם קישור מאובטח לאיפוס הסיסמה
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      שולח...
                    </>
                  ) : (
                    'שלחו קישור לאיפוס'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                  <Mail className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-blue-900 mb-2">
                    אימייל נשלח!
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    שלחנו קישור לאיפוס הסיסמה לכתובת:
                  </p>
                  <p className="font-medium text-blue-900 mb-4" dir="ltr">
                    {email}
                  </p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>• בדוק גם בתיקיית הספאם</p>
                    <p>• הקישור תקף למשך 24 שעות</p>
                    <p>• אם לא קיבלת את האימייל, נסה לשלוח שוב</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleResendEmail}
                    variant="outline"
                    className="w-full"
                    disabled={isSubmitting || countdown > 0}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        שולח...
                      </>
                    ) : countdown > 0 ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        שלח שוב בעוד {countdown} שניות
                      </>
                    ) : (
                      'שלח שוב'
                    )}
                  </Button>

                  <Button
                    onClick={handleBackToLogin}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    חזור להתחברות
                  </Button>
                </div>
              </div>
            )}

            {!emailSent && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">או</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={handleBackToLogin}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    חזור להתחברות
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      אין לך חשבון?{' '}
                      <Link
                        to={createPageUrl('Signup')}
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        הירשם עכשיו
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}
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