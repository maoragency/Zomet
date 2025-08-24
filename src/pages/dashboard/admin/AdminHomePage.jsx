import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Car,
  MessageSquare,
  TrendingUp,
  Eye,
  Calendar,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Shield,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  Target,
  Award,
  Star,
  Gauge,
  PieChart,
  LineChart,
  Database,
  Wifi,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Timer,
  Flame,
  Sparkles,
  TrendingDown,
  Settings
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Mock chart data - in real app, this would come from your analytics service
const generateChartData = (days = 7) => {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), 'dd/MM'),
    users: Math.floor(Math.random() * 50) + 10,
    vehicles: Math.floor(Math.random() * 30) + 5,
    revenue: Math.floor(Math.random() * 1000) + 200
  }));
};

export default function AdminHomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Debug logging for admin access
  console.log('🏠 AdminHomePage - User:', {
    email: user?.email,
    role: user?.role,
    isAdmin: user?.role === 'admin' || user?.email === 'zometauto@gmail.com'
  });

  // Enhanced real-time statistics
  const [stats, setStats] = useState({
    users: { 
      total: 0, 
      active: 0, 
      newToday: 0, 
      verified: 0,
      growth: 0,
      retention: 0
    },
    vehicles: { 
      total: 0, 
      active: 0, 
      pending: 0, 
      sold: 0,
      promoted: 0,
      avgPrice: 0
    },
    messages: { 
      total: 0, 
      unread: 0, 
      todayCount: 0,
      responseTime: 0
    },
    revenue: {
      today: 0,
      thisMonth: 0,
      lastMonth: 0,
      growth: 0,
      promotions: 0
    },
    system: { 
      uptime: 99.9, 
      responseTime: 145, 
      errors: 0,
      load: 23,
      memory: 67,
      disk: 45,
      connections: 156
    }
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [chartData, setChartData] = useState(generateChartData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Load comprehensive admin statistics
  const loadAdminStats = useCallback(async () => {
    if (!user || user.email !== 'zometauto@gmail.com') return;
    
    try {
      setLoading(true);
      setError(null);

      // Parallel data fetching for better performance
      const [usersResult, vehiclesResult, messagesResult] = await Promise.all([
        supabase.from('users').select('id, is_active, last_login, created_at, email_verified'),
        supabase.from('vehicles').select('id, status, created_at, price, promoted, views'),
        supabase.from('messages').select('id, is_read, created_at, sender_id, recipient_id')
      ]);

      const users = usersResult.data || [];
      const vehicles = vehiclesResult.data || [];
      const messages = messagesResult.data || [];

      // Calculate advanced metrics
      const now = new Date();
      const today = startOfDay(now);
      const yesterday = startOfDay(subDays(now, 1));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // User metrics
      const newUsersToday = users.filter(u => new Date(u.created_at) >= today).length;
      const newUsersYesterday = users.filter(u => 
        new Date(u.created_at) >= yesterday && new Date(u.created_at) < today
      ).length;
      const activeUsers = users.filter(u => u.is_active && u.last_login && 
        new Date(u.last_login) >= subDays(now, 7)).length;
      const verifiedUsers = users.filter(u => u.email_verified).length;
      const userGrowth = newUsersYesterday > 0 ? 
        ((newUsersToday - newUsersYesterday) / newUsersYesterday * 100) : 100;

      // Vehicle metrics
      const pendingVehicles = vehicles.filter(v => v.status === 'pending').length;
      const approvedVehicles = vehicles.filter(v => v.status === 'approved').length;
      const soldVehicles = vehicles.filter(v => v.status === 'sold').length;
      const promotedVehicles = vehicles.filter(v => v.promoted).length;
      const avgPrice = vehicles.length > 0 ? 
        vehicles.reduce((sum, v) => sum + (v.price || 0), 0) / vehicles.length : 0;

      // Message metrics
      const unreadMessages = messages.filter(m => !m.is_read).length;
      const todayMessages = messages.filter(m => new Date(m.created_at) >= today).length;

      // Revenue calculations (mock data for now)
      const todayRevenue = promotedVehicles * 50; // 50 NIS per promotion
      const thisMonthRevenue = vehicles.filter(v => 
        v.promoted && new Date(v.created_at) >= thisMonth
      ).length * 50;
      const lastMonthRevenue = vehicles.filter(v => 
        v.promoted && new Date(v.created_at) >= lastMonth && new Date(v.created_at) < thisMonth
      ).length * 50;
      const revenueGrowth = lastMonthRevenue > 0 ? 
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 100;

      // System metrics (simulated)
      const systemLoad = Math.floor(Math.random() * 30) + 15;
      const memoryUsage = Math.floor(Math.random() * 20) + 60;
      const responseTime = Math.floor(Math.random() * 50) + 120;

      setStats({
        users: {
          total: users.length,
          active: activeUsers,
          newToday: newUsersToday,
          verified: verifiedUsers,
          growth: userGrowth,
          retention: users.length > 0 ? (activeUsers / users.length * 100) : 0
        },
        vehicles: {
          total: vehicles.length,
          active: approvedVehicles,
          pending: pendingVehicles,
          sold: soldVehicles,
          promoted: promotedVehicles,
          avgPrice: Math.round(avgPrice)
        },
        messages: {
          total: messages.length,
          unread: unreadMessages,
          todayCount: todayMessages,
          responseTime: Math.floor(Math.random() * 60) + 30 // Mock response time in minutes
        },
        revenue: {
          today: todayRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          growth: revenueGrowth,
          promotions: promotedVehicles
        },
        system: {
          uptime: 99.9,
          responseTime,
          errors: pendingVehicles > 10 ? 1 : 0,
          load: systemLoad,
          memory: memoryUsage,
          disk: 45,
          connections: Math.floor(Math.random() * 50) + 100
        }
      });

      // Generate recent activity
      const activities = [
        ...users.slice(-10).map(u => ({
          id: `user-${u.id}`,
          type: 'user_registered',
          title: 'משתמש חדש נרשם',
          description: u.email,
          timestamp: u.created_at,
          icon: Users,
          color: 'blue'
        })),
        ...vehicles.slice(-10).map(v => ({
          id: `vehicle-${v.id}`,
          type: 'vehicle_added',
          title: 'מודעה חדשה נוספה',
          description: `מחיר: ₪${v.price?.toLocaleString() || 'לא צוין'}`,
          timestamp: v.created_at,
          icon: Car,
          color: 'green'
        })),
        ...messages.slice(-5).map(m => ({
          id: `message-${m.id}`,
          type: 'message_sent',
          title: 'הודעה חדשה נשלחה',
          description: 'בין משתמשים',
          timestamp: m.created_at,
          icon: MessageSquare,
          color: 'purple'
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

      setRecentActivity(activities);

      // Generate top performers (mock data)
      setTopPerformers([
        { name: 'משתמש פעיל', value: activeUsers, change: '+12%', type: 'users' },
        { name: 'מודעות מאושרות', value: approvedVehicles, change: '+8%', type: 'vehicles' },
        { name: 'הכנסות חודשיות', value: `₪${thisMonthRevenue.toLocaleString()}`, change: `+${Math.round(revenueGrowth)}%`, type: 'revenue' }
      ]);

      // Generate system alerts
      const alerts = [];
      if (pendingVehicles > 5) {
        alerts.push({
          id: 'pending-vehicles',
          type: 'warning',
          title: `${pendingVehicles} מודעות ממתינות לאישור`,
          description: 'דורש בדיקה ואישור מנהל',
          action: '/admin/vehicles'
        });
      }
      if (unreadMessages > 20) {
        alerts.push({
          id: 'unread-messages',
          type: 'info',
          title: `${unreadMessages} הודעות לא נקראו`,
          description: 'הודעות חדשות מחכות לטיפול',
          action: '/admin/messages'
        });
      }
      if (systemLoad > 80) {
        alerts.push({
          id: 'high-load',
          type: 'error',
          title: 'עומס מערכת גבוה',
          description: `עומס נוכחי: ${systemLoad}%`,
          action: '/admin/analytics'
        });
      }
      setSystemAlerts(alerts);

      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Error loading admin stats:', error);
      setError('שגיאה בטעינת נתוני המערכת');
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את נתוני המערכת",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Load stats on mount and refresh every minute
  useEffect(() => {
    loadAdminStats();
    const interval = setInterval(loadAdminStats, 60000);
    return () => clearInterval(interval);
  }, [loadAdminStats]);

  // Update chart data when time range changes
  useEffect(() => {
    const days = selectedTimeRange === '24h' ? 1 : 
                 selectedTimeRange === '7d' ? 7 : 
                 selectedTimeRange === '30d' ? 30 : 7;
    setChartData(generateChartData(days));
  }, [selectedTimeRange]);

  if (loading && stats.users.total === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            מרכז הבקרה
          </h1>
          <Button disabled>
            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
            טוען...
          </Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת נתוני המערכת</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={loadAdminStats}>
              <RefreshCw className="h-4 w-4 ml-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-white min-h-screen">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
            מרכז הבקרה המתקדם
          </h1>
          <p className="text-slate-600 text-lg">
            ניהול מקצועי של פלטפורמת צומת • עדכון אחרון: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: he })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadAdminStats} variant="outline" className="shadow-sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן נתונים
          </Button>
          <Badge variant="secondary" className="bg-green-100 text-green-700 px-3 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            מערכת פעילה
          </Badge>
        </div>
      </div>  
    {/* Enhanced KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Users Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">סך הכל משתמשים</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-1">{stats.users.total.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                {stats.users.active} פעילים
              </Badge>
              {stats.users.newToday > 0 && (
                <Badge className="bg-green-500 text-white">
                  +{stats.users.newToday} היום
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              {stats.users.growth > 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : stats.users.growth < 0 ? (
                <ArrowDown className="h-3 w-3 mr-1" />
              ) : (
                <Minus className="h-3 w-3 mr-1" />
              )}
              {Math.abs(stats.users.growth).toFixed(1)}% מאתמול
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">סך הכל מודעות</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <Car className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-1">{stats.vehicles.total.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                {stats.vehicles.active} מאושרות
              </Badge>
              {stats.vehicles.pending > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {stats.vehicles.pending} ממתינות
                </Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-green-600">
              מחיר ממוצע: ₪{stats.vehicles.avgPrice.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">הכנסות חודשיות</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-1">₪{stats.revenue.thisMonth.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                ₪{stats.revenue.today} היום
              </Badge>
            </div>
            <div className="mt-2 flex items-center text-xs text-purple-600">
              {stats.revenue.growth > 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : stats.revenue.growth < 0 ? (
                <ArrowDown className="h-3 w-3 mr-1" />
              ) : (
                <Minus className="h-3 w-3 mr-1" />
              )}
              {Math.abs(stats.revenue.growth).toFixed(1)}% מחודש שעבר
            </div>
          </CardContent>
        </Card>

        {/* System Health Card */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">בריאות מערכת</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Gauge className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-1">{stats.system.uptime}%</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                {stats.system.responseTime}ms
              </Badge>
              {stats.system.errors === 0 ? (
                <Badge className="bg-green-500 text-white">
                  ללא שגיאות
                </Badge>
              ) : (
                <Badge variant="destructive">
                  {stats.system.errors} שגיאות
                </Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-orange-600">
              {stats.system.connections} חיבורים פעילים
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            סקירה כללית
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            אנליטיקה
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Server className="h-4 w-4 mr-2" />
            מערכת
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Activity className="h-4 w-4 mr-2" />
            פעילות
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick Actions */}
            <Card className="lg:col-span-1 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  פעולות מהירות
                </CardTitle>
                <CardDescription>גישה מהירה לפעולות נפוצות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50 hover:border-blue-200 transition-all duration-200">
                    <Users className="h-4 w-4 mr-2" />
                    ניהול משתמשים
                    {stats.users.newToday > 0 && (
                      <Badge className="mr-auto bg-blue-500">
                        {stats.users.newToday}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/admin/vehicles">
                  <Button variant="outline" className="w-full justify-start hover:bg-green-50 hover:border-green-200 transition-all duration-200">
                    <Car className="h-4 w-4 mr-2" />
                    ניהול מודעות
                    {stats.vehicles.pending > 0 && (
                      <Badge variant="destructive" className="mr-auto animate-pulse">
                        {stats.vehicles.pending}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/admin/analytics">
                  <Button variant="outline" className="w-full justify-start hover:bg-purple-50 hover:border-purple-200 transition-all duration-200">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    אנליטיקה מתקדמת
                  </Button>
                </Link>

              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="lg:col-span-2 border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  מדדי ביצוע מובילים
                </CardTitle>
                <CardDescription>הנתונים החשובים ביותר במערכת</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          performer.type === 'users' ? 'bg-blue-100 text-blue-600' :
                          performer.type === 'vehicles' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {performer.type === 'users' ? <Users className="h-4 w-4" /> :
                           performer.type === 'vehicles' ? <Car className="h-4 w-4" /> :
                           <DollarSign className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-medium">{performer.name}</div>
                          <div className="text-sm text-slate-500">ביצועים מעולים</div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold">{performer.value}</div>
                        <div className={`text-sm flex items-center ${
                          performer.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {performer.change.startsWith('+') ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          {performer.change}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Alerts */}
          {systemAlerts.length > 0 && (
            <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  התראות מערכת
                </CardTitle>
                <CardDescription>פריטים הדורשים תשומת לב</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemAlerts.map((alert) => (
                    <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'error' ? 'bg-red-50 border-l-red-500' :
                      alert.type === 'warning' ? 'bg-orange-50 border-l-orange-500' :
                      'bg-blue-50 border-l-blue-500'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          <div className="text-sm text-slate-600 mt-1">{alert.description}</div>
                        </div>
                        <Link to={alert.action}>
                          <Button size="sm" variant="outline">
                            טפל בבעיה
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart placeholder */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-500" />
                  מגמות שימוש
                </CardTitle>
                <CardDescription>נתוני שימוש ב-7 הימים האחרונים</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                    <p className="text-slate-600">גרף אנליטיקה יוצג כאן</p>
                    <p className="text-sm text-slate-500">נתונים מ-{chartData.length} ימים אחרונים</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  מדדי ביצוע מפורטים
                </CardTitle>
                <CardDescription>נתונים מתקדמים על ביצועי המערכת</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">שיעור המרה</span>
                    <span className="text-sm text-green-600 font-bold">
                      {((stats.vehicles.active / stats.vehicles.total) * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={(stats.vehicles.active / stats.vehicles.total) * 100 || 0} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">שביעות רצון משתמשים</span>
                    <span className="text-sm text-blue-600 font-bold">4.7/5</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">זמן תגובה ממוצע</span>
                    <span className="text-sm text-purple-600 font-bold">{stats.messages.responseTime} דקות</span>
                  </div>
                  <Progress value={Math.max(0, 100 - stats.messages.responseTime)} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">שיעור משתמשים פעילים</span>
                    <span className="text-sm text-orange-600 font-bold">
                      {((stats.users.active / stats.users.total) * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={(stats.users.active / stats.users.total) * 100 || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>        {/*
 System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Resources */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-500" />
                  משאבי מערכת
                </CardTitle>
                <CardDescription>מעקב בזמן אמת אחר משאבי השרת</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CPU Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">עומס מעבד</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      stats.system.load < 50 ? 'text-green-600' : 
                      stats.system.load < 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stats.system.load}%
                    </span>
                  </div>
                  <Progress value={stats.system.load} className="h-2" />
                </div>

                {/* Memory Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemoryStick className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">זיכרון</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      stats.system.memory < 70 ? 'text-green-600' : 
                      stats.system.memory < 90 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stats.system.memory}%
                    </span>
                  </div>
                  <Progress value={stats.system.memory} className="h-2" />
                </div>

                {/* Disk Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">אחסון</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      stats.system.disk < 70 ? 'text-green-600' : 
                      stats.system.disk < 90 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {stats.system.disk}%
                    </span>
                  </div>
                  <Progress value={stats.system.disk} className="h-2" />
                </div>

                {/* Network */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">רשת</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {stats.system.connections} חיבורים
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Wifi className="h-3 w-3" />
                    <span>זמן תגובה: {stats.system.responseTime}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  סטטוס מערכת
                </CardTitle>
                <CardDescription>מידע כללי על מצב המערכת</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">זמינות</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{stats.system.uptime}%</div>
                    <div className="text-xs text-green-600">30 ימים אחרונים</div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">תגובה</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{stats.system.responseTime}ms</div>
                    <div className="text-xs text-blue-600">ממוצע יומי</div>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">בסיס נתונים</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">99.9%</div>
                    <div className="text-xs text-purple-600">זמינות</div>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">אבטחה</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-900">{stats.system.errors}</div>
                    <div className="text-xs text-orange-600">התראות פעילות</div>
                  </div>
                </div>

                {/* System Info */}
                <div className="pt-4 border-t">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">גרסת מערכת:</span>
                      <span className="font-medium">v2.1.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">עדכון אחרון:</span>
                      <span className="font-medium">{formatDistanceToNow(lastUpdate, { addSuffix: true, locale: he })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">סביבה:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Production
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                פעילות אחרונה במערכת
              </CardTitle>
              <CardDescription>
                מעקב אחר כל הפעילויות החשובות במערכת • {recentActivity.length} פעילויות
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className={`p-2 rounded-lg ${
                        activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                        activity.color === 'green' ? 'bg-green-100 text-green-600' :
                        activity.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-900">{activity.title}</p>
                          <time className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: he })}
                          </time>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}