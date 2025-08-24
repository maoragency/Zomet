import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { safeNavigate, ROUTES } from '@/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Car,
  BarChart3,
  Settings,
  FileText,
  LogOut,
  Menu,
  Bell,
  Home,
  ChevronLeft,
  UserCircle,
  Shield,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  Moon,
  Sun,
  Gauge
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const breadcrumbMap = {
  '/admin': 'מרכז הבקרה',
  '/admin/dashboard': 'לוח בקרה ראשי',
  '/admin/users': 'ניהול משתמשים',
  '/admin/vehicles': 'ניהול מודעות',
  '/admin/analytics': 'אנליטיקה מתקדמת',
  '/admin/audit': 'יומני ביקורת'
};

export default function AdminDashboardLayout() {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Enhanced real-time admin stats
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalVehicles: 0,
    pendingVehicles: 0,
    systemAlerts: 0,
    platformHealth: 95
  });

  // Check admin access
  useEffect(() => {
    if (user && user.email !== 'zometauto@gmail.com' && !isAdmin) {
      toast({
        title: "אין הרשאה",
        description: "אין לך הרשאה לגשת לפאנל המנהל",
        variant: "destructive"
      });
      safeNavigate(navigate, ROUTES.DASHBOARD);
    }
  }, [user, isAdmin, navigate, toast]);

  // Load admin statistics
  useEffect(() => {
    const loadAdminStats = async () => {
      if (!user || user.email !== 'zometauto@gmail.com') return;
      
      try {
        const [usersResult, vehiclesResult] = await Promise.all([
          supabase.from('users').select('id, is_active'),
          supabase.from('vehicles').select('id, status')
        ]);

        const users = usersResult.data || [];
        const vehicles = vehiclesResult.data || [];

        const activeUsers = users.filter(u => u.is_active).length;
        const pendingVehicles = vehicles.filter(v => v.status === 'pending').length;

        setAdminStats({
          totalUsers: users.length,
          activeUsers,
          totalVehicles: vehicles.length,
          pendingVehicles,
          systemAlerts: pendingVehicles,
          platformHealth: 95
        });

      } catch (error) {
        console.error('Error loading admin stats:', error);
      }
    };

    loadAdminStats();
    const interval = setInterval(loadAdminStats, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Enhanced sidebar items
  const adminSidebarItems = [
    {
      title: 'מרכז הבקרה',
      href: '/admin',
      icon: Gauge,
      description: 'סקירה כללית ומדדי ביצוע',
      badge: null
    },
    {
      title: 'ניהול משתמשים',
      href: '/admin/users',
      icon: Users,
      description: 'ניהול חשבונות והרשאות',
      badge: adminStats.totalUsers > 0 ? adminStats.totalUsers : null
    },
    {
      title: 'ניהול מודעות',
      href: '/admin/vehicles',
      icon: Car,
      description: 'אישור מודעות וניהול תוכן',
      badge: adminStats.pendingVehicles > 0 ? adminStats.pendingVehicles : null,
      urgent: adminStats.pendingVehicles > 0
    },
    {
      title: 'אנליטיקה מתקדמת',
      href: '/admin/analytics',
      icon: BarChart3,
      description: 'דוחות מפורטים וניתוח נתונים',
      badge: null
    },

    {
      title: 'יומני ביקורת',
      href: '/admin/audit',
      icon: FileText,
      description: 'מעקב פעילות ויומני מערכת',
      badge: null
    }
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      safeNavigate(navigate, ROUTES.HOME);
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "שגיאה בהתנתקות",
        description: "אירעה שגיאה בהתנתקות מהמערכת",
        variant: "destructive"
      });
      safeNavigate(navigate, ROUTES.HOME, { replace: true });
    }
  };

  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    breadcrumbs.push({ title: 'דף הבית', href: '/' });
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const title = breadcrumbMap[currentPath] || segment;
      
      if (index === pathSegments.length - 1) {
        breadcrumbs.push({ title, href: currentPath, isLast: true });
      } else {
        breadcrumbs.push({ title, href: currentPath });
      }
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (user && user.email !== 'zometauto@gmail.com' && !isAdmin) {
    return null;
  }

  const SidebarContent = ({ onItemClick }) => (
    <div className={`flex flex-col h-full transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white' 
        : 'bg-gradient-to-b from-white via-slate-50 to-white text-slate-900 border-r border-slate-200'
    }`}>
      {/* Admin Profile Section */}
      <div className={`p-6 border-b ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
      } backdrop-blur-sm`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-blue-400 shadow-lg">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {user?.full_name || user?.email}
            </p>
            <p className={`text-xs truncate ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {user?.email}
            </p>

          </div>
        </div>
        
        {/* System Stats */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <Card className={`${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/80 border-slate-200'} backdrop-blur-sm`}>
            <CardContent className="p-3 text-center">
              <div className="font-bold text-lg text-blue-500">{adminStats.totalUsers}</div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>משתמשים</div>
            </CardContent>
          </Card>
          <Card className={`${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-white/80 border-slate-200'} backdrop-blur-sm`}>
            <CardContent className="p-3 text-center">
              <div className="font-bold text-lg text-green-500">{adminStats.totalVehicles}</div>
              <div className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>מודעות</div>
              {adminStats.pendingVehicles > 0 && (
                <Badge variant="destructive" className="mt-1 text-xs animate-pulse">
                  {adminStats.pendingVehicles} ממתינות
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>בריאות מערכת</span>
            <span className="text-green-500 font-medium">{adminStats.platformHealth}%</span>
          </div>
          <Progress value={adminStats.platformHealth} className="h-2" />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {adminSidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || 
                          (item.href === '/admin' && location.pathname === '/admin/dashboard');
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onItemClick}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium shadow-lg transform scale-[1.02]'
                  : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              } ${item.urgent ? 'animate-pulse' : ''}`}
            >
              <div className={`p-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-white/20 shadow-sm' 
                  : isDarkMode
                    ? 'group-hover:bg-slate-600'
                    : 'group-hover:bg-slate-200'
              }`}>
                <Icon className={`h-4 w-4 ${
                  isActive 
                    ? 'text-white' 
                    : isDarkMode 
                      ? 'text-slate-400 group-hover:text-white' 
                      : 'text-slate-500 group-hover:text-slate-700'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">{item.title}</span>
                  {item.badge && (
                    <Badge 
                      variant={item.urgent ? "destructive" : "secondary"} 
                      className={`text-xs ml-2 ${
                        item.urgent 
                          ? 'bg-red-500 text-white animate-bounce shadow-lg' 
                          : isDarkMode
                            ? 'bg-slate-600 text-slate-200'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <div className={`text-xs mt-0.5 truncate ${
                  isActive 
                    ? 'text-white/80' 
                    : isDarkMode 
                      ? 'text-slate-400' 
                      : 'text-slate-500'
                }`}>
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r shadow-sm"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t ${
        isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50/50'
      } backdrop-blur-sm`}>
        <Button
          variant="ghost"
          className={`w-full justify-start transition-all duration-200 ${
            isDarkMode 
              ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
          }`}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          התנתק
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    }`} dir="rtl">
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-all duration-300 ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-700 shadow-lg shadow-slate-900/20' 
          : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between px-6 py-4">
          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Breadcrumb */}
          <div className="flex-1 px-4">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.href}>
                    <BreadcrumbItem>
                      {breadcrumb.isLast ? (
                        <BreadcrumbPage className={`font-bold text-lg ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {breadcrumb.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={breadcrumb.href} className={`transition-colors ${
                            isDarkMode 
                              ? 'text-slate-400 hover:text-white' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}>
                            {breadcrumb.title}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator>
                        <ChevronLeft className="h-4 w-4" />
                      </BreadcrumbSeparator>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden md:block relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="חיפוש מהיר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-64 pr-10 transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400' 
                    : 'bg-white border-slate-200'
                }`}
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>


          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 md:top-[89px] z-40">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:mr-80 flex flex-col min-h-screen">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}