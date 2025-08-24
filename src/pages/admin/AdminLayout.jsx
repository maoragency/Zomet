import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime, useRealTimeMessages, useRealTimeNotifications } from '@/hooks/useRealTime';
import { messagingService } from '@/services/messaging';
import { vehicleService } from '@/services/vehicles';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import {
  Shield,
  Users,
  Car,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
  Home,
  ChevronLeft,
  UserCircle,
  Activity,
  Database,
  Wifi,
  WifiOff,
  Clock,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap,
  Globe,
  Smartphone,
  Server,
  HardDrive,
  Cpu,
  Monitor,
  FileText,
  DollarSign,
  Star,
  Flag,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Power,
  Trash2,
  Edit,
  Plus,
  Minus,
  X,
  Check
} from 'lucide-react';

const adminSidebarItems = [
  {
    title: 'סקירה כללית',
    href: '/admin',
    icon: BarChart3,
    description: 'נתונים כלליים וסטטיסטיקות מערכת',
    badge: null,
    color: 'text-blue-600'
  },
  {
    title: 'ניהול משתמשים',
    href: '/admin/users',
    icon: Users,
    description: 'ניהול משתמשים, הרשאות ופרופילים',
    badge: null,
    color: 'text-green-600'
  },
  {
    title: 'ניהול מודעות',
    href: '/admin/vehicles',
    icon: Car,
    description: 'אישור, עריכה ומחיקת מודעות',
    badge: null,
    color: 'text-purple-600'
  },
  {
    title: 'מערכת הודעות',
    href: '/admin/messages',
    icon: MessageSquare,
    description: 'ניטור הודעות ותקשורת במערכת',
    badge: null,
    color: 'text-orange-600'
  },
  {
    title: 'דוחות ואנליטיקה',
    href: '/admin/analytics',
    icon: TrendingUp,
    description: 'דוחות מפורטים וניתוח נתונים',
    badge: null,
    color: 'text-indigo-600'
  },

];

const breadcrumbMap = {
  '/admin': 'לוח בקרה מנהל',
  '/admin/users': 'ניהול משתמשים',
  '/admin/vehicles': 'ניהול מודעות',
  '/admin/messages': 'מערכת הודעות',
  '/admin/analytics': 'דוחות ואנליטיקה'
};

export default function AdminLayout() {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Real-time state
  const { isConnected, connectionError } = useRealTime();
  const { newMessages, onlineUsers, updatePresence, clearNewMessages } = useRealTimeMessages();
  const { newNotifications, requestNotificationPermission, clearNewNotifications } = useRealTimeNotifications();
  
  // Admin dashboard stats
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalVehicles: 0,
    pendingVehicles: 0,
    totalMessages: 0,
    unreadMessages: 0,
    systemHealth: 100,
    serverLoad: 0,
    databaseSize: 0,
    activeConnections: 0,
    todayRegistrations: 0,
    todayVehicles: 0,
    todayMessages: 0,
    errorCount: 0,
    warningCount: 0
  });
  
  // System monitoring
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkTraffic: 0,
    responseTime: 0,
    uptime: 0,
    lastBackup: null,
    securityAlerts: 0
  });
  
  // Connection and activity tracking
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState(0);

  // Check admin permissions
  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/dashboard');
      toast({
        title: "אין הרשאה",
        description: "אין לך הרשאות מנהל לגשת לעמוד זה",
        variant: "destructive"
      });
    }
  }, [user, isAdmin, navigate, toast]);

  // Initialize admin dashboard
  useEffect(() => {
    if (!user || !isAdmin) return;

    const initializeAdminDashboard = async () => {
      try {
        // Request notification permission
        await requestNotificationPermission();
        
        // Update user presence
        await updatePresence(true);
        
        // Load admin statistics
        await loadAdminStats();
        
        // Load system metrics
        await loadSystemMetrics();
        
        // Track session start
        const sessionStart = Date.now();
        setSessionDuration(0);
        
        // Set up session duration tracking
        const sessionInterval = setInterval(() => {
          setSessionDuration(Math.floor((Date.now() - sessionStart) / 1000));
        }, 1000);
        
        return () => {
          clearInterval(sessionInterval);
          updatePresence(false);
        };
      } catch (error) {
        console.error('Error initializing admin dashboard:', error);
      }
    };

    initializeAdminDashboard();
  }, [user, isAdmin, requestNotificationPermission, updatePresence]);

  // Handle real-time messages
  useEffect(() => {
    if (newMessages.length > 0) {
      setAdminStats(prev => ({
        ...prev,
        unreadMessages: prev.unreadMessages + newMessages.length,
        totalMessages: prev.totalMessages + newMessages.length
      }));
      
      clearNewMessages();
    }
  }, [newMessages, clearNewMessages]);

  // Handle real-time notifications
  useEffect(() => {
    if (newNotifications.length > 0) {
      // Process admin-specific notifications
      newNotifications.forEach(notification => {
        if (notification.type === 'system_alert') {
          setSystemMetrics(prev => ({
            ...prev,
            securityAlerts: prev.securityAlerts + 1
          }));
        }
      });
      
      clearNewNotifications();
    }
  }, [newNotifications, clearNewNotifications]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(new Date());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) updatePresence(true);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (user) updatePresence(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, updatePresence]);

  // Load admin statistics
  const loadAdminStats = async () => {
    try {
      const startTime = Date.now();
      
      // Get user statistics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, is_active, created_at, last_login');
      
      if (usersError) throw usersError;
      
      // Get vehicle statistics
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, status, created_at');
      
      if (vehiclesError) throw vehiclesError;
      
      // Get message statistics
      const messageResponse = await messagingService.getMessageStats();
      const messageStats = messageResponse.success ? messageResponse.data : { 
        inbox: { total: 0, unread: 0 },
        sent: { total: 0 }
      };
      
      // Calculate time-based statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayRegistrations = users?.filter(u => 
        new Date(u.created_at) >= today
      ).length || 0;
      
      const todayVehicles = vehicles?.filter(v => 
        new Date(v.created_at) >= today
      ).length || 0;
      
      const activeUsers = users?.filter(u => u.is_active).length || 0;
      const pendingVehicles = vehicles?.filter(v => v.status === 'pending').length || 0;
      
      // Calculate performance metrics
      const responseTime = Date.now() - startTime;
      
      setAdminStats({
        totalUsers: users?.length || 0,
        activeUsers,
        totalVehicles: vehicles?.length || 0,
        pendingVehicles,
        totalMessages: messageStats.inbox.total + messageStats.sent.total,
        unreadMessages: messageStats.inbox.unread || 0,
        systemHealth: Math.max(0, 100 - (responseTime > 1000 ? 20 : 0)),
        serverLoad: Math.floor(Math.random() * 30) + 20, // Mock data
        databaseSize: Math.floor(Math.random() * 500) + 100, // Mock data in MB
        activeConnections: onlineUsers.size,
        todayRegistrations,
        todayVehicles,
        todayMessages: Math.floor(Math.random() * 50), // Mock data
        errorCount: Math.floor(Math.random() * 5),
        warningCount: Math.floor(Math.random() * 10)
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את נתוני המערכת",
        variant: "destructive"
      });
    }
  };

  // Load system metrics
  const loadSystemMetrics = async () => {
    try {
      // Mock system metrics (in real app, these would come from monitoring APIs)
      setSystemMetrics({
        cpuUsage: Math.floor(Math.random() * 40) + 20,
        memoryUsage: Math.floor(Math.random() * 60) + 30,
        diskUsage: Math.floor(Math.random() * 50) + 25,
        networkTraffic: Math.floor(Math.random() * 100) + 50,
        responseTime: Math.floor(Math.random() * 200) + 100,
        uptime: Math.floor(Math.random() * 30) + 1, // Days
        lastBackup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        securityAlerts: Math.floor(Math.random() * 3)
      });
    } catch (error) {
      console.error('Error loading system metrics:', error);
    }
  };

  // Format session duration
  const formatSessionDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate breadcrumbs
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Add home
    breadcrumbs.push({ title: 'דף הבית', href: '/' });
    
    // Build path progressively
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

  const handleLogout = async () => {
    try {
      // Update presence before logout
      if (user) await updatePresence(false);
      
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "שגיאה בהתנתקות",
        description: "אירעה שגיאה בהתנתקות מהמערכת",
        variant: "destructive"
      });
    }
  };

  const breadcrumbs = generateBreadcrumbs();

  // Enhanced sidebar items with real-time data
  const enhancedSidebarItems = adminSidebarItems.map(item => ({
    ...item,
    badge: item.href === '/admin/vehicles' && adminStats.pendingVehicles > 0 ? adminStats.pendingVehicles :
           item.href === '/admin/messages' && adminStats.unreadMessages > 0 ? adminStats.unreadMessages :
           item.href === '/admin/users' && adminStats.todayRegistrations > 0 ? adminStats.todayRegistrations :
           null,
    urgent: (item.href === '/admin/vehicles' && adminStats.pendingVehicles > 0) ||
            (item.href === '/admin/messages' && adminStats.unreadMessages > 0)
  }));

  const SidebarContent = ({ onItemClick }) => (
    <div className="flex flex-col h-full">
      {/* Enhanced Admin Profile Section */}
      <div className="p-6 border-b bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-red-200">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="bg-red-100 text-red-800 font-semibold">
                {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            {/* Admin crown indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <Shield className="h-2 w-2 text-white" />
            </div>
            {/* Online status indicator */}
            <div className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-white ${
              isOnline && isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isConnected ? 'מחובר לשרת' : 'לא מחובר לשרת'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        {/* System Health Overview */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white rounded-lg p-2 text-center">
            <div className={`font-semibold ${
              adminStats.systemHealth > 90 ? 'text-green-600' :
              adminStats.systemHealth > 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {adminStats.systemHealth}%
            </div>
            <div className="text-gray-500">בריאות מערכת</div>
          </div>
          <div className="bg-white rounded-lg p-2 text-center">
            <div className="font-semibold text-blue-600">{adminStats.activeConnections}</div>
            <div className="text-gray-500">חיבורים פעילים</div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {enhancedSidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <TooltipProvider key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    onClick={onItemClick}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 relative group ${
                      isActive
                        ? 'bg-red-100 text-red-800 font-medium shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                    } ${item.urgent ? 'animate-pulse' : ''}`}
                  >
                    <div className={`p-1 rounded-md ${isActive ? 'bg-red-200' : 'group-hover:bg-gray-200'}`}>
                      <Icon className={`h-4 w-4 ${isActive ? item.color : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.urgent ? "destructive" : "secondary"} 
                            className={`text-xs ml-2 ${item.urgent ? 'animate-bounce' : ''}`}
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {item.description}
                      </div>
                    </div>
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r"></div>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.description}</p>
                  {item.badge && <p className="text-xs mt-1">יש {item.badge} פריטים הדורשים טיפול</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* Enhanced Footer with System Info */}
      <div className="p-4 border-t bg-gray-50">
        {/* System metrics */}
        <div className="mb-3 text-xs text-gray-600 space-y-1">
          <div className="flex items-center justify-between">
            <span>זמן פעילות מערכת:</span>
            <span className="font-mono">{systemMetrics.uptime} ימים</span>
          </div>
          <div className="flex items-center justify-between">
            <span>זמן תגובה:</span>
            <span className={`${systemMetrics.responseTime > 500 ? 'text-red-500' : 'text-green-500'}`}>
              {systemMetrics.responseTime}ms
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>שימוש CPU:</span>
            <span className={`${systemMetrics.cpuUsage > 80 ? 'text-red-500' : 'text-green-500'}`}>
              {systemMetrics.cpuUsage}%
            </span>
          </div>
          {systemMetrics.securityAlerts > 0 && (
            <div className="flex items-center justify-between text-red-600">
              <span>התראות אבטחה:</span>
              <span className="font-bold">{systemMetrics.securityAlerts}</span>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 ml-2" />
          התנתק
        </Button>
      </div>
    </div>
  );

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">אין הרשאות מנהל</h2>
          <p className="text-gray-600 mb-4">אין לך הרשאות לגשת לאזור המנהל.</p>
          <Button onClick={() => navigate('/dashboard')}>
            חזור לדשבורד
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Enhanced Admin Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-800 border-b border-red-700 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden text-white hover:bg-red-700">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Admin Breadcrumb Navigation */}
          <div className="flex-1 px-4">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <React.Fragment key={breadcrumb.href}>
                    <BreadcrumbItem>
                      {breadcrumb.isLast ? (
                        <BreadcrumbPage className="font-medium text-red-100">
                          {breadcrumb.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={breadcrumb.href} className="text-red-200 hover:text-white">
                            {breadcrumb.title}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator className="text-red-300">
                        <ChevronLeft className="h-4 w-4" />
                      </BreadcrumbSeparator>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Enhanced Admin Header Actions */}
          <div className="flex items-center gap-3">
            {/* System Health Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-white text-xs ${
                    adminStats.systemHealth > 90 ? 'bg-green-600' :
                    adminStats.systemHealth > 70 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}>
                    <Server className="h-3 w-3" />
                    {adminStats.systemHealth}%
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p>בריאות מערכת: {adminStats.systemHealth}%</p>
                    <p>עומס שרת: {adminStats.serverLoad}%</p>
                    <p>חיבורים פעילים: {adminStats.activeConnections}</p>
                    <p>שגיאות: {adminStats.errorCount}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4 text-white text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{adminStats.totalUsers}</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                <span>{adminStats.totalVehicles}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{adminStats.totalMessages}</span>
              </div>
            </div>

            {/* Enhanced Admin Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative text-white hover:bg-red-700">
                  <Bell className="h-4 w-4" />
                  {(adminStats.pendingVehicles > 0 || adminStats.unreadMessages > 0 || systemMetrics.securityAlerts > 0) && (
                    <Badge className="absolute -top-1 -left-1 h-5 w-5 p-0 text-xs bg-yellow-500 animate-pulse">
                      {adminStats.pendingVehicles + adminStats.unreadMessages + systemMetrics.securityAlerts}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>התראות מנהל</span>
                  <Badge variant="outline" className="text-xs">
                    {adminStats.pendingVehicles + adminStats.unreadMessages + systemMetrics.securityAlerts} דורשות טיפול
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <div className="max-h-96 overflow-y-auto">
                  {adminStats.pendingVehicles > 0 && (
                    <DropdownMenuItem onClick={() => navigate('/admin/vehicles')} className="cursor-pointer">
                      <Car className="h-4 w-4 ml-2 text-purple-500" />
                      <div className="flex-1">
                        <div className="font-medium">{adminStats.pendingVehicles} מודעות ממתינות לאישור</div>
                        <div className="text-xs text-gray-500">לחץ לצפייה ואישור</div>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {adminStats.pendingVehicles}
                      </Badge>
                    </DropdownMenuItem>
                  )}
                  
                  {adminStats.unreadMessages > 0 && (
                    <DropdownMenuItem onClick={() => navigate('/admin/messages')} className="cursor-pointer">
                      <MessageSquare className="h-4 w-4 ml-2 text-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium">{adminStats.unreadMessages} הודעות חדשות</div>
                        <div className="text-xs text-gray-500">הודעות דורשות תשומת לב</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {adminStats.unreadMessages}
                      </Badge>
                    </DropdownMenuItem>
                  )}
                  

                  
                  {adminStats.todayRegistrations > 0 && (
                    <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer">
                      <Users className="h-4 w-4 ml-2 text-green-500" />
                      <div className="flex-1">
                        <div className="font-medium">{adminStats.todayRegistrations} משתמשים חדשים היום</div>
                        <div className="text-xs text-gray-500">הרשמות חדשות</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        חדש
                      </Badge>
                    </DropdownMenuItem>
                  )}
                </div>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/analytics')} className="cursor-pointer text-center">
                  <span className="w-full text-sm text-blue-600">צפה בכל הדוחות</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Enhanced Admin User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 text-white hover:bg-red-700">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.avatar_url} />
                      <AvatarFallback className="bg-red-100 text-red-800 text-xs font-semibold">
                        {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Admin crown */}
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Shield className="h-2 w-2 text-white" />
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                      <Clock className="h-3 w-3" />
                      {formatSessionDuration(sessionDuration)}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Quick System Stats */}
                <div className="px-2 py-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-red-50 rounded p-2 text-center">
                      <div className="font-semibold text-red-600">{adminStats.systemHealth}%</div>
                      <div className="text-gray-500">בריאות</div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-amber-50 rounded p-2 text-center">
                      <div className="font-semibold text-blue-600">{adminStats.activeConnections}</div>
                      <div className="text-gray-500">חיבורים</div>
                    </div>
                  </div>
                </div>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="cursor-pointer">
                    <UserCircle className="h-4 w-4 ml-2" />
                    פרופיל אישי
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <Home className="h-4 w-4 ml-2" />
                    דשבורד משתמש
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <Globe className="h-4 w-4 ml-2" />
                    חזרה לאתר
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 ml-2" />
                  התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Admin Sidebar */}
        <aside className="hidden md:flex md:w-80 md:flex-col md:fixed md:inset-y-0 md:top-[73px] bg-white border-l border-gray-200 shadow-lg">
          <SidebarContent />
        </aside>

        {/* Main Admin Content */}
        <main className="flex-1 md:mr-80 flex flex-col">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
          
          {/* Enhanced Admin Footer */}
          <footer className="border-t bg-gradient-to-r from-gray-50 to-red-50 px-6 py-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-6">
                <span className="text-gray-600">© 2025 צומת - לוח בקרה מנהל</span>
                
                {/* System Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    adminStats.systemHealth > 90 ? 'bg-green-500' :
                    adminStats.systemHealth > 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-500">
                    מערכת {adminStats.systemHealth > 90 ? 'תקינה' : adminStats.systemHealth > 70 ? 'יציבה' : 'דורשת טיפול'}
                  </span>
                </div>
                
                {/* Server Load */}
                <div className="flex items-center gap-2">
                  <Server className="h-3 w-3 text-gray-400" />
                  <span className={`${
                    adminStats.serverLoad < 50 ? 'text-green-600' :
                    adminStats.serverLoad < 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    עומס: {adminStats.serverLoad}%
                  </span>
                </div>
                
                {/* Database Size */}
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">
                    DB: {adminStats.databaseSize}MB
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Admin Info */}
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-red-500" />
                  <span className="text-gray-600 font-medium">
                    מנהל: {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'מנהל'}
                  </span>
                </div>
                
                {/* Session Duration */}
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500 font-mono">
                    {formatSessionDuration(sessionDuration)}
                  </span>
                </div>
                
                {/* Active Connections */}
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">
                    {adminStats.activeConnections} מחוברים
                  </span>
                </div>
                
                {/* Pending Items Indicator */}
                {(adminStats.pendingVehicles > 0 || systemMetrics.securityAlerts > 0) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-2 cursor-pointer animate-pulse">
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <Badge variant="destructive" className="text-xs">
                            {adminStats.pendingVehicles + systemMetrics.securityAlerts}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>יש פריטים הדורשים טיפול מיידי</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {/* Last Backup */}
                {systemMetrics.lastBackup && (
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">
                      גיבוי: {systemMetrics.lastBackup.toLocaleDateString('he-IL')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* System Health Progress Bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>בריאות מערכת כללית</span>
                <span>{adminStats.systemHealth}%</span>
              </div>
              <Progress 
                value={adminStats.systemHealth} 
                className="h-1"
              />
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}