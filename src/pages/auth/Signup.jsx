import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle, Check, X, ArrowRight, Sparkles, Gift, Car } from 'lucide-react';
import { createPageUrl } from '@/utils';
import AuthBackground from '@/components/auth/AuthBackground';
import TrustIndicators from '@/components/auth/TrustIndicators';
import AuthLoader from '@/components/auth/AuthLoader';
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator';
import AnimatedButton from '@/components/auth/AnimatedButton';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, user, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate(createPageUrl('Home'), { replace: true });
    }
  }, [user, loading, navigate]);

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
    if (!formData.fullName.trim()) {
      setError('נדרש שם מלא');
      return false;
    }
    
    if (formData.fullName.trim().length < 2) {
      setError('שם מלא חייב להכיל לפחות 2 תווים');
      return false;
    }
    
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
    
    if (passwordStrength < 60) {
      setError('הסיסמה חלשה מדי. אנא בחר סיסמה חזקה יותר');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return false;
    }
    
    if (formData.phone && !/^[\d\-\+\(\)\s]+$/.test(formData.phone)) {
      setError('מספר טלפון לא תקין');
      return false;
    }
    
    if (!agreedToTerms) {
      setError('נדרש לאשר את תנאי השימוש');
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
      const result = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone: formData.phone
      });
      
      // Check if sign up was successful
      if (result && !result.error) {
        setSuccess('נרשמת בהצלחה! נשלח אליך אימייל לאימות החשבון');
        
        // Redirect to login with success message
        setTimeout(() => {
          navigate(createPageUrl('Login') + '?message=' + encodeURIComponent('נרשמת בהצלחה! אנא אמת את כתובת האימייל שלך ולאחר מכן התחבר') + '&type=success');
        }, 2000);
      } else {
        // Handle error from result
        const errorMessage = result?.error?.message || 'שגיאה בהרשמה';
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('User already registered')) {
        setError('כתובת האימייל כבר רשומה במערכת');
      } else if (error.message?.includes('Password should be at least')) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      } else if (error.message?.includes('Invalid email')) {
        setError('כתובת אימייל לא תקינה');
      } else {
        setError(error.message || 'שגיאה בהרשמה. אנא נסה שוב');
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

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 20) return 'bg-red-500';
    if (passwordStrength < 40) return 'bg-orange-500';
    if (passwordStrength < 60) return 'bg-yellow-500';
    if (passwordStrength < 80) return 'bg-gradient-to-r from-blue-50 to-amber-500';
    return 'bg-green-500';
  };

  if (loading) {
    return <AuthLoader message="מכין את החשבון החדש..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex">
      <AuthBackground variant="signup" />

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="bg-purple-600 rounded-2xl p-3">
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
              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                <Gift className="h-3 w-3 mr-1" />
                הרשמה חינם לזמן מוגבל
              </Badge>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              יצירת חשבון חדש
            </h2>
            <p className="mt-2 text-gray-600">
              הצטרפו לאלפי משתמשים מרוצים
            </p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-gray-900">
                הרשמה
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                מלאו את הפרטים ליצירת חשבון חדש
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
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                      שם מלא *
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                      <Input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        placeholder="הזינו את השם המלא שלכם"
                        className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      כתובת אימייל *
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="example@email.com"
                        className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        autoComplete="email"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      מספר טלפון (אופציונלי)
                    </Label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="050-1234567"
                        className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        autoComplete="tel"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      סיסמה *
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="בחרו סיסמה חזקה"
                        className="pl-10 pr-12 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        autoComplete="new-password"
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
                    
                    <PasswordStrengthIndicator 
                      password={formData.password}
                      checks={passwordChecks}
                      strength={passwordStrength}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      אימות סיסמה *
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="הזינו את הסיסמה שוב"
                        className="pl-10 pr-12 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        required
                        autoComplete="new-password"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-sm text-red-600 flex items-center">
                        <X className="h-3 w-3 mr-1" />
                        הסיסמאות אינן תואמות
                      </p>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password && (
                      <p className="text-sm text-green-600 flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        הסיסמאות תואמות
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-start space-x-3 rtl:space-x-reverse">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-colors mt-0.5"
                      required
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                      אני מסכים/ה ל
                      <Link to="#" className="text-purple-600 hover:text-purple-700 font-medium mx-1 underline">
                        תנאי השימוש
                      </Link>
                      ול
                      <Link to="#" className="text-purple-600 hover:text-purple-700 font-medium mx-1 underline">
                        מדיניות הפרטיות
                      </Link>
                      של הפלטפורמה
                    </Label>
                  </div>
                </div>

                <AnimatedButton
                  type="submit"
                  variant="signup"
                  isLoading={isSubmitting}
                  loadingText="נרשם..."
                  disabled={isSubmitting || passwordStrength < 60 || !agreedToTerms}
                >
                  צרו חשבון חדש
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
                  יש לכם כבר חשבון?{' '}
                  <Link
                    to={createPageUrl('Login')}
                    className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    התחברו עכשיו
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