import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, ArrowRight, Sparkles, Car } from 'lucide-react';
import { createPageUrl } from '@/utils';
import AuthBackground from '@/components/auth/AuthBackground';
import TrustIndicators from '@/components/auth/TrustIndicators';
import AuthLoader from '@/components/auth/AuthLoader';
import AnimatedButton from '@/components/auth/AnimatedButton';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    console.log('Login useEffect - user:', user?.email, 'role:', user?.role, 'loading:', loading)
    if (user && !loading) {
      // Check if user is admin and redirect accordingly
      const isAdminUser = user.role === 'admin' || user.email === 'zometauto@gmail.com';
      const defaultPath = isAdminUser ? ROUTES.ADMIN : ROUTES.DASHBOARD;
      const from = location.state?.from?.pathname || defaultPath;
      console.log('Redirecting to:', from, 'isAdmin:', isAdminUser, 'userRole:', user.role)
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, location]);

  // Check for success messages from other pages
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type');
    
    if (message && type === 'success') {
      setSuccess(decodeURIComponent(message));
      // Clean URL
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('נדרש כתובת אימייל');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError('כתובת אימייל לא תקינה');
      return false;
    }
    
    if (!formData.password) {
      setError('נדרשת סיסמה');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
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
      console.log('Attempting sign in for:', formData.email)
      const result = await signIn(formData.email, formData.password);
      console.log('Sign in result:', result)
      
      // Check if sign in was successful
      if (result && !result.error) {
        // Success - user will be redirected by useEffect
        setSuccess('התחברת בהצלחה! מעביר אותך...');
        console.log('Sign in successful, waiting for redirect...')
        
        // Navigate after a short delay to show success message
        setTimeout(() => {
          // The useEffect will handle the redirect based on user role
          console.log('Sign in successful, useEffect will handle redirect')
        }, 1000);
      } else {
        // Handle error from result
        const errorMessage = result?.error?.message || 'שגיאה בהתחברות';
        console.error('Sign in failed:', errorMessage)
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        setError('כתובת אימייל או סיסמה שגויים');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('נדרש לאמת את כתובת האימייל. אנא בדוק את תיבת הדואר שלך');
      } else if (error.message?.includes('Too many requests')) {
        setError('יותר מדי ניסיונות התחברות. אנא נסה שוב מאוחר יותר');
      } else {
        setError(error.message || 'שגיאה בהתחברות. אנא נסה שוב');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    navigate(createPageUrl('ForgotPassword'), {
      state: { email: formData.email }
    });
  };

  if (loading) {
    return <AuthLoader message="מאמת פרטי התחברות..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      <AuthBackground variant="login" />

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="bg-blue-600 rounded-2xl p-3 transform hover:scale-105 transition-transform duration-300">
                <Car className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">צומת</h1>
                <p className="text-gray-600 text-sm">מרכז הרכב הישראלי</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-amber-50 text-blue-700 border-blue-200">
                <Sparkles className="h-3 w-3 mr-1" />
                חדש! דשבורד מתקדם
              </Badge>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              ברוכים השבים
            </h2>
            <p className="mt-2 text-gray-600">
              התחברו לחשבון שלכם כדי להמשיך
            </p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-gray-900">
                התחברות
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                הזינו את פרטי ההתחברות שלכם
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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      כתובת אימייל
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="example@email.com"
                        className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        autoComplete="email"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      סיסמה
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="הזינו את הסיסמה שלכם"
                        className="pl-10 pr-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        autoComplete="current-password"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                    />
                    <Label htmlFor="remember-me" className="mr-2 text-sm text-gray-700 cursor-pointer">
                      זכור אותי
                    </Label>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    שכחתם סיסמה?
                  </button>
                </div>

                <AnimatedButton
                  type="submit"
                  variant="login"
                  isLoading={isSubmitting}
                  loadingText="מתחבר..."
                  disabled={isSubmitting}
                >
                  התחבר
                  <ArrowRight className="h-4 w-4 mr-2" />
                </AnimatedButton>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">או</span>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  אין לכם חשבון?{' '}
                  <Link
                    to={createPageUrl('Signup')}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    הירשמו עכשיו
                  </Link>
                </p>
                
                <div className="pt-4 border-t border-gray-100">
                  <Link
                    to={createPageUrl('Home')}
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ← חזרה לעמוד הבית
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="text-center space-y-4">
            <TrustIndicators variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}