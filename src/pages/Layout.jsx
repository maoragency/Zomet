

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl, safeNavigate, ROUTES } from "@/utils";
import { Car, Plus, Home, Phone, Star, CreditCard, Search, Landmark, Calculator, Shield, LogOut, UserCircle, List, Mail } from "lucide-react";

import { SkipTarget } from '@/components/accessibility/SkipLinks';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: isLoadingUser, signOut } = useAuth();

  // Debug logging
  console.log('Layout - user:', user?.email, 'loading:', isLoadingUser);

  useEffect(() => {
    // Scroll to top on every page change
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogin = () => {
    safeNavigate(navigate, ROUTES.LOGIN);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      safeNavigate(navigate, ROUTES.HOME);
    } catch (error) {
      console.error('Logout error:', error);
      // Force navigation to home even if logout fails
      safeNavigate(navigate, ROUTES.HOME, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      <style>
        {`
          :root {
            --primary-blue: #1e3a8a;
            --gold-accent: #f59e0b;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --surface: rgba(255, 255, 255, 0.95);
            --border: rgba(229, 231, 235, 0.8);
          }
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Variable', 'Helvetica Neue', sans-serif;
          }
          
          .glass-effect {
            backdrop-filter: blur(12px);
            background: var(--surface);
            border: 1px solid var(--border);
          }
          
          .gradient-text {
            background: linear-gradient(135deg, var(--primary-blue), var(--gold-accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          
          .hover-lift {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(30, 58, 138, 0.15);
          }

          .premium-glow {
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
            border: 2px solid #f59e0b;
          }

          /* --- NEW ANIMATION --- */
          .fade-in {
            animation: fadeIn 0.5s ease-in-out forwards;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          /* --- END NEW ANIMATION --- */

          .no-underline {
            text-decoration: none !important;
          }

          .no-underline:hover {
            text-decoration: none !important;
          }

          .corporate-branding {
            letter-spacing: -0.02em;
            font-weight: 700;
          }

          .platform-tagline {
            font-weight: 500;
            letter-spacing: 0.01em;
            opacity: 0.85;
          }

          .category-separator {
            font-weight: 600;
            color: #f59e0b;
          }
        `}
      </style>

      {/* Header */}
      <SkipTarget as="header" id="main-navigation" className="bg-white border-b border-gray-200 relative z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link 
              to={ROUTES.HOME} 
              className="flex items-center gap-4 hover-lift"
              style={{ textDecoration: 'none' }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-800 via-blue-700 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Car className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl corporate-branding gradient-text">צומת</h1>
                <p className="text-sm platform-tagline text-gray-600 mt-0.5">הפלטפורמה לרכב כבד בישראל</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="ניווט ראשי">
              <Link 
                to={ROUTES.HOME} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-gradient-to-r from-blue-50 to-amber-50 text-gray-700"
              >
                <Home className="w-4 h-4" />
                דף הבית
              </Link>
              
              <Link 
                to={ROUTES.VEHICLE_PRICING} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-green-50 text-gray-700"
              >
                <Calculator className="w-4 h-4" />
                מחירון רכב
              </Link>
              
              <Link 
                to={ROUTES.FINANCING} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-indigo-50 text-gray-700"
              >
                <Landmark className="w-4 h-4" />
                מימון
              </Link>
              
              <Link 
                to={ROUTES.INSURANCE} 
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-green-50 text-gray-700"
              >
                <Shield className="w-4 h-4" />
                ביטוח
              </Link>
              

            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Link 
                to={ROUTES.ADD_VEHICLE} 
                className="bg-gradient-to-r from-blue-800 to-amber-500 text-white px-6 py-3 rounded-xl font-semibold hover-lift shadow-lg"
              >
                <Plus className="w-5 h-5 inline ml-2" />
                פרסם מודעה
              </Link>
              
              { isLoadingUser ? (
                <Skeleton className="h-10 w-28 rounded-lg" />
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 border-gray-300">
                      <UserCircle className="w-5 h-5" />
                      {user.full_name ? user.full_name.split(' ')[0] : (user.email ? user.email.split('@')[0] : 'משתמש')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => {
                      // Navigate to admin dashboard if user is admin, otherwise regular dashboard
                      const isAdminUser = user?.role === 'admin' || user?.email === 'zometauto@gmail.com';
                      const dashboardPath = isAdminUser ? '/admin' : '/dashboard';
                      console.log('🎯 Navigation decision:', {
                        userEmail: user?.email,
                        userRole: user?.role,
                        isAdminUser,
                        dashboardPath
                      });
                      safeNavigate(navigate, dashboardPath);
                    }} className="cursor-pointer">
                      <UserCircle className="w-4 h-4 ml-2" />
                      <span>לוח בקרה</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => safeNavigate(navigate, ROUTES.MY_LISTINGS)} className="cursor-pointer">
                      <List className="w-4 h-4 ml-2" />
                      <span>המודעות שלי</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 ml-2" />
                      <span>התנתק</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" onClick={handleLogin} className="text-gray-700">
                  התחברות | הרשמה
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t bg-white/90">
          <div className="flex justify-around py-3">
            <Link 
              to={ROUTES.HOME} 
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-gray-600 hover:text-blue-800 transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">דף הבית</span>
            </Link>
            <Link 
              to={ROUTES.VEHICLE_PRICING} 
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-gray-600 hover:text-green-600 transition-colors"
            >
              <Calculator className="w-5 h-5" />
              <span className="text-xs">מחירון רכב</span>
            </Link>
            <Link 
              to={ROUTES.FINANCING} 
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <Landmark className="w-5 h-5" />
              <span className="text-xs">מימון</span>
            </Link>
            <Link 
              to={ROUTES.INSURANCE} 
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-gray-600 hover:text-green-600 transition-colors"
            >
              <Shield className="w-5 h-5" />
              <span className="text-xs">ביטוח</span>
            </Link>

          </div>
        </div>
      </SkipTarget>

      {/* Main Content */}
      <SkipTarget as="main" id="main-content" className="flex-1" role="main">
        {children}
      </SkipTarget>

      {/* Footer */}
      <SkipTarget as="footer" id="footer" className="bg-white/95 backdrop-blur-sm border-t mt-20" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-800 to-amber-500 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold gradient-text">צומת בע״מ</h3>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                הפלטפורמה המקצועית והמובילה במדינה למכירת ורכישת משאיות,
                אוטובוסים, מיניבוסים וציוד כבד. מחברים בין מוכרים לקונים בצורה פשוטה, 
                בטוחה ומקצועית.
              </p>
              <div className="flex gap-8"> {/* Changed gap-4 to gap-8 */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-800">1,500+</div>
                  <div className="text-sm text-gray-600">רכבים נמכרו</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">24/7</div>
                  <div className="text-sm text-gray-600">שירות לקוחות</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">שירות לקוחות</h4>
              <p className="text-gray-600 mb-4">
                יש לך שאלה או צריך עזרה? נשמח לעזור לך!
              </p>
              <Link to={ROUTES.CONTACT}>
                <Button className="w-full bg-gradient-to-r from-blue-800 to-amber-500 text-white hover-lift shadow-lg">
                  <Mail className="w-4 h-4 ml-2" />
                  צור קשר
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8">
            <div className="text-center text-gray-500">
              <p>&copy; 2024 צומת בע״מ. כל הזכויות שמורות.</p>
            </div>
          </div>
        </div>
      </SkipTarget>
    </div>
  );
}

