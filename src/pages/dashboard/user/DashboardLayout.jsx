import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { safeNavigate, ROUTES } from '@/utils';
import { messagingService } from '@/services/messaging';
import { vehicleService } from '@/services/vehicles';
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
import { useToast } from '@/components/ui/use-toast';
import {
  User,
  Activity,
  Car,
  MessageSquare,
  LogOut,
  Menu,
  Bell,
  Home,
  ChevronLeft,
  Plus,
  Settings
} from 'lucide-react';

const breadcrumbMap = {
  '/dashboard': 'לוח בקרה',
  '/dashboard/profile': 'פרופיל',
  '/dashboard/ads': 'המודעות שלי',
  '/dashboard/messages': 'הודעות'
};

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Simple dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    unreadMessages: 0,
    activeAds: 0,
    totalViews: 0
  });

  // Clean sidebar items - only relevant for users (removed Activity)
  const sidebarItems = [
    {
      title: 'לוח בקרה',
      href: '/dashboard',
      icon: Home,
      description: 'דף הבית של הדשבורד'
    },
    {
      title: 'המודעות שלי',
      href: '/dashboard/ads',
      icon: Car,
      description: 'ניהול מודעות הרכב שלי',
      badge: dashboardStats.activeAds > 0 ? dashboardStats.activeAds : null
    },
    {
      title: 'הודעות',
      href: '/dashboard/messages',
      icon: MessageSquare,
      description: 'תיבת דואר נכנס',
      badge: dashboardStats.unreadMessages > 0 ? dashboardStats.unreadMessages : null
    },
    {
      title: 'פרופיל',
      href: '/dashboard/profile',
      icon: User,
      description: 'הגדרות חשבון אישי'
    }
  ];

  // Load dashboard statistics
  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!user) return;
      
      try {
        // Get user's vehicle stats
        const vehicleResponse = await vehicleService.getByUser(user.id);
        const vehicles = vehicleResponse || [];
        
        // Get message stats
        const messageResponse = await messagingService.getMessageStats();
        const messageStats = messageResponse.success ? messageResponse.data : { 
          inbox: { unread: 0 }
        };
        
        setDashboardStats({
          unreadMessages: messageStats.inbox.unread || 0,
          activeAds: vehicles.filter(v => v.status === 'למכירה').length,
          totalViews: vehicles.reduce((sum, vehicle) => sum + (vehicle.views_count || 0), 0)
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    };

    loadDashboardStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(loadDashboardStats, 300000);
    return () => clearInterval(interval);
  }, [user]);

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
      // Force navigation even if logout fails
      safeNavigate(navigate, ROUTES.HOME, { replace: true });
    }
  };

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

  const breadcrumbs = generateBreadcrumbs();

  const SidebarContent = ({ onItemClick }) => (
    <div className="flex flex-col h-full bg-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">צומת</span>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                  {user?.full_name ? user.full_name.charAt(0) : user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>חשבון אישי</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/dashboard/profile" className="cursor-pointer">
                <User className="h-4 w-4 ml-2" />
                פרופיל אישי
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={ROUTES.HOME} className="cursor-pointer">
                <Home className="h-4 w-4 ml-2" />
                חזרה לאתר הראשי
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4 ml-2" />
              התנתק מהמערכת
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation Items - Professional */}
      <nav className="flex-1 p-6 space-y-2">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            ניווט ראשי
          </h2>
        </div>
        
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className={`p-1 rounded ${isActive ? 'bg-blue-100' : 'group-hover:bg-gray-100'}`}>
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
              </div>
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs h-5 px-2">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>


    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dashboard-layout" dir="rtl">


      <div className="flex">
        {/* Desktop Sidebar - Professional */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-20 bg-white border-l border-gray-200 shadow-sm dashboard-sidebar dashboard-sidebar-fixed">
          <SidebarContent />
        </aside>

        {/* Mobile Menu Button */}
        <div className="md:hidden fixed top-32 right-4 mobile-menu-button z-50">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white shadow-lg border-gray-300 hover:bg-gray-50">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 mobile-sheet">
              <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content - Compact and Professional */}
        <main className="flex-1 md:mr-64 dashboard-main-content">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}