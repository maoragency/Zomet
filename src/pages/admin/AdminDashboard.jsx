import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRealTime, useRealTimeMessages, useRealTimeNotifications } from '@/hooks/useRealTime';
import { messagingService } from '@/services/messaging';
import { vehicleService } from '@/services/vehicles';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Shield,
  Users,
  Car,
  MessageSquare,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  DollarSign,
  Star,
  Flag,
  Zap,
  Globe,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Settings,
  Bell,
  Search,
  Filter,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  CarIcon,
  MessageCircle,
  FileText,
  PieChart,
  LineChart
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { isConnected } = useRealTime();
  const { onlineUsers } = useRealTimeMessages();
  
  // Admin dashboard state
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      newUsersToday: 0,
      totalVehicles: 0,
      pendingVehicles: 0,
      approvedVehicles: 0,
      totalMessages: 0,
      unreadMessages: 0,
      systemHealth: 100,
      revenue: 0,
      conversionRate: 0
    },
    systemMetrics: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkTraffic: 0,
      responseTime: 0,
      uptime: 0,
      activeConnections: 0,
      errorRate: 0,
      throughput: 0
    },
    recentActivity: [],
    topPerformers: {
      topUsers: [],
      topVehicles: [],
      topCategories: []
    },
    alerts: [],
    trends: {
      userGrowth: 0,
      vehicleGrowth: 0,
      messageGrowth: 0,
      revenueGrowth: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Load comprehensive admin dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    if (!user || !isAdmin) return;
    
    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      
      // Load all data in parallel for better performance
      const [
        usersData,
        vehiclesData,
        messagesData,
        systemData,
        activityData
      ] = await Promise.all([
        loadUsersData(),
        loadVehiclesData(), 
        loadMessagesData(),
        loadSystemData(),
        loadActivityData()
      ]);
      
      // Calculate performance metrics
      const responseTime = Date.now() - startTime;
      
      setDashboardData({
        overview: {
          ...usersData,
          ...vehiclesData,
          ...messagesData,
          systemHealth: calculateSystemHealth(responseTime, systemData),
          revenue: calculateRevenue(vehiclesData),
          conversionRate: calculateConversionRate(usersData, vehiclesData)
        },
        systemMetrics: {
          ...systemData,
          responseTime,
          activeConnections: onlineUsers.size,
          errorRate: calculateErrorRate(),
          throughput: calculateThroughput()
        },
        recentActivity: activityData,
        topPerformers: await loadTopPerformers(),
        alerts: generateSystemAlerts(systemData, usersData, vehiclesData),
        trends: calculateTrends(usersData, vehiclesData, messagesData)
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      setError('שגיאה בטעינת נתוני הדשבורד');
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את נתוני הדשבורד",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };  // 
Load users data
  const loadUsersData = async () => {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, is_active, created_at, last_login, role');
    
    if (error) throw error;
    
    const now = new Date();
    const today = startOfDay(now);
    
    return {
      totalUsers: users?.length || 0,
      activeUsers: users?.filter(u => u.is_active).length || 0,
      newUsersToday: users?.filter(u => new Date(u.created_at) >= today).length || 0
    };
  };

  // Load vehicles data
  const loadVehiclesData = async () => {
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, status, created_at, price, views_count');
    
    if (error) throw error;
    
    return {
      totalVehicles: vehicles?.length || 0,
      pendingVehicles: vehicles?.filter(v => v.status === 'pending').length || 0,
      approvedVehicles: vehicles?.filter(v => v.status === 'approved' || v.status === 'למכירה').length || 0
    };
  };

  // Load messages data
  const loadMessagesData = async () => {
    const messageResponse = await messagingService.getMessageStats();
    const messageStats = messageResponse.success ? messageResponse.data : { 
      inbox: { total: 0, unread: 0 },
      sent: { total: 0 }
    };
    
    return {
      totalMessages: messageStats.inbox.total + messageStats.sent.total,
      unreadMessages: messageStats.inbox.unread || 0
    };
  };

  // Load system data (mock data - in real app would come from monitoring APIs)
  const loadSystemData = async () => {
    return {
      cpuUsage: Math.floor(Math.random() * 40) + 20,
      memoryUsage: Math.floor(Math.random() * 60) + 30,
      diskUsage: Math.floor(Math.random() * 50) + 25,
      networkTraffic: Math.floor(Math.random() * 100) + 50,
      uptime: Math.floor(Math.random() * 30) + 1 // Days
    };
  };

  // Load recent activity
  const loadActivityData = async () => {
    const { data: activities, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) return [];
    
    return activities?.map(activity => ({
      id: activity.id,
      action: activity.action,
      user_id: activity.user_id,
      resource_type: activity.resource_type,
      resource_id: activity.resource_id,
      details: activity.details,
      created_at: activity.created_at,
      type: getActivityType(activity.action),
      icon: getActivityIcon(activity.action),
      color: getActivityColor(activity.action)
    })) || [];
  };

  // Load top performers
  const loadTopPerformers = async () => {
    try {
      // Top users by activity
      const { data: topUsers } = await supabase
        .from('users')
        .select('id, full_name, email, login_count')
        .order('login_count', { ascending: false })
        .limit(5);

      // Top vehicles by views
      const { data: topVehicles } = await supabase
        .from('vehicles')
        .select('id, title, views_count, price')
        .order('views_count', { ascending: false })
        .limit(5);

      return {
        topUsers: topUsers || [],
        topVehicles: topVehicles || [],
        topCategories: [] // Would be calculated from vehicle data
      };
    } catch (error) {
      console.error('Error loading top performers:', error);
      return { topUsers: [], topVehicles: [], topCategories: [] };
    }
  };

  // Helper functions
  const calculateSystemHealth = (responseTime, systemData) => {
    let health = 100;
    if (responseTime > 1000) health -= 20;
    if (systemData.cpuUsage > 80) health -= 15;
    if (systemData.memoryUsage > 85) health -= 15;
    if (systemData.diskUsage > 90) health -= 20;
    return Math.max(0, health);
  };

  const calculateRevenue = (vehiclesData) => {
    // Mock revenue calculation
    return vehiclesData.approvedVehicles * 150; // Average fee per vehicle
  };

  const calculateConversionRate = (usersData, vehiclesData) => {
    if (usersData.totalUsers === 0) return 0;
    return Math.round((vehiclesData.totalVehicles / usersData.totalUsers) * 100);
  };

  const calculateErrorRate = () => {
    return Math.floor(Math.random() * 5); // Mock error rate
  };

  const calculateThroughput = () => {
    return Math.floor(Math.random() * 1000) + 500; // Mock requests per minute
  };

  const calculateTrends = (usersData, vehiclesData, messagesData) => {
    // Mock trend calculations (in real app would compare with previous periods)
    return {
      userGrowth: Math.floor(Math.random() * 20) - 10,
      vehicleGrowth: Math.floor(Math.random() * 30) - 15,
      messageGrowth: Math.floor(Math.random() * 25) - 12,
      revenueGrowth: Math.floor(Math.random() * 15) - 7
    };
  };

  const generateSystemAlerts = (systemData, usersData, vehiclesData) => {
    const alerts = [];
    
    if (systemData.cpuUsage > 80) {
      alerts.push({
        id: 'cpu-high',
        type: 'warning',
        title: 'שימוש גבוה ב-CPU',
        message: `שימוש ב-CPU: ${systemData.cpuUsage}%`,
        action: 'בדוק תהליכים פעילים'
      });
    }
    
    if (vehiclesData.pendingVehicles > 10) {
      alerts.push({
        id: 'pending-vehicles',
        type: 'info',
        title: 'מודעות ממתינות לאישור',
        message: `${vehiclesData.pendingVehicles} מודעות ממתינות`,
        action: 'עבור לאישור מודעות'
      });
    }
    
    if (systemData.diskUsage > 85) {
      alerts.push({
        id: 'disk-space',
        type: 'error',
        title: 'מקום דיסק נמוך',
        message: `שימוש בדיסק: ${systemData.diskUsage}%`,
        action: 'נקה קבצים או הוסף שטח'
      });
    }
    
    return alerts;
  };

  const getActivityType = (action) => {
    const typeMap = {
      'signin_success': 'auth',
      'vehicle_created': 'vehicle',
      'message_sent': 'message',
      'user_registered': 'user'
    };
    return typeMap[action] || 'system';
  };

  const getActivityIcon = (action) => {
    const iconMap = {
      'signin_success': UserCheck,
      'vehicle_created': Car,
      'message_sent': MessageSquare,
      'user_registered': Users
    };
    return iconMap[action] || Activity;
  };

  const getActivityColor = (action) => {
    const colorMap = {
      'signin_success': 'text-green-600',
      'vehicle_created': 'text-blue-600',
      'message_sent': 'text-purple-600',
      'user_registered': 'text-orange-600'
    };
    return colorMap[action] || 'text-gray-600';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('he-IL').format(num);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'עכשיו';
    if (diffInMinutes < 60) return `לפני ${diffInMinutes} דקות`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `לפני ${diffInHours} שעות`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `לפני ${diffInDays} ימים`;
    
    return format(date, 'dd/MM/yyyy', { locale: he });
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">אין הרשאות מנהל</h2>
          <p className="text-gray-600">אין לך הרשאות לגשת לדשבורד המנהל.</p>
        </div>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">דשבורד מנהל</h1>
            <p className="text-gray-600">טוען נתונים...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            דשבורד מנהל מערכת
          </h1>
          <p className="text-gray-600 mt-1">
            ניהול ומעקב אחר כל פעילות המערכת בזמן אמת
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'מרענן...' : 'רענן נתונים'}
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            עודכן: {lastUpdate.toLocaleTimeString('he-IL')}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      {dashboardData.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboardData.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'error' ? 'bg-red-50 border-red-500' :
                alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                'bg-gradient-to-r from-blue-50 to-amber-50 border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className={`h-5 w-5 ${
                    alert.type === 'error' ? 'text-red-500' :
                    alert.type === 'warning' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {alert.action}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}    
  {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Users Overview */}
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(dashboardData.overview.totalUsers)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{dashboardData.overview.activeUsers} פעילים</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {dashboardData.trends.userGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {Math.abs(dashboardData.trends.userGrowth)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">
                {dashboardData.overview.newUsersToday} הרשמות היום
              </div>
              <Progress 
                value={(dashboardData.overview.activeUsers / dashboardData.overview.totalUsers) * 100} 
                className="h-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicles Overview */}
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">מודעות רכב</CardTitle>
            <Car className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(dashboardData.overview.totalVehicles)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{dashboardData.overview.approvedVehicles} מאושרות</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {dashboardData.trends.vehicleGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {Math.abs(dashboardData.trends.vehicleGrowth)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">ממתינות לאישור:</span>
                <Badge variant={dashboardData.overview.pendingVehicles > 0 ? "destructive" : "secondary"}>
                  {dashboardData.overview.pendingVehicles}
                </Badge>
              </div>
              <Progress 
                value={(dashboardData.overview.approvedVehicles / dashboardData.overview.totalVehicles) * 100} 
                className="h-1 mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Messages Overview */}
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הודעות</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(dashboardData.overview.totalMessages)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{dashboardData.overview.unreadMessages} לא נקראו</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {dashboardData.trends.messageGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {Math.abs(dashboardData.trends.messageGrowth)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">
                פעילות הודעות גבוהה
              </div>
              <Progress 
                value={Math.min((dashboardData.overview.totalMessages / 1000) * 100, 100)} 
                className="h-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">בריאות מערכת</CardTitle>
            <Server className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              dashboardData.overview.systemHealth > 90 ? 'text-green-600' :
              dashboardData.overview.systemHealth > 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {dashboardData.overview.systemHealth}%
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{dashboardData.systemMetrics.uptime} ימי פעילות</span>
              <span>•</span>
              <span>{dashboardData.systemMetrics.responseTime}ms</span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">
                ביצועי מערכת
              </div>
              <Progress 
                value={dashboardData.overview.systemHealth} 
                className="h-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">הכנסות חודשיות</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardData.overview.revenue)}
                </p>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {dashboardData.trends.revenueGrowth >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={dashboardData.trends.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(dashboardData.trends.revenueGrowth)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">שיעור המרה</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardData.overview.conversionRate}%
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  משתמשים שפרסמו מודעות
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Active Connections */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">חיבורים פעילים</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dashboardData.systemMetrics.activeConnections}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  משתמשים מחוברים כעת
                </p>
              </div>
              <Wifi className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card className="bg-gradient-to-r from-red-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">שיעור שגיאות</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboardData.systemMetrics.errorRate}%
                </p>
                <p className="text-xs text-red-600 mt-1">
                  שגיאות בשעה האחרונה
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            מדדי מערכת בזמן אמת
          </CardTitle>
          <CardDescription>
            ניטור ביצועי השרת והמערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">שימוש CPU</span>
                <span className={`text-sm font-bold ${
                  dashboardData.systemMetrics.cpuUsage > 80 ? 'text-red-600' :
                  dashboardData.systemMetrics.cpuUsage > 60 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {dashboardData.systemMetrics.cpuUsage}%
                </span>
              </div>
              <Progress value={dashboardData.systemMetrics.cpuUsage} className="h-2" />
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">שימוש זיכרון</span>
                <span className={`text-sm font-bold ${
                  dashboardData.systemMetrics.memoryUsage > 85 ? 'text-red-600' :
                  dashboardData.systemMetrics.memoryUsage > 70 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {dashboardData.systemMetrics.memoryUsage}%
                </span>
              </div>
              <Progress value={dashboardData.systemMetrics.memoryUsage} className="h-2" />
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">שימוש דיסק</span>
                <span className={`text-sm font-bold ${
                  dashboardData.systemMetrics.diskUsage > 90 ? 'text-red-600' :
                  dashboardData.systemMetrics.diskUsage > 75 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {dashboardData.systemMetrics.diskUsage}%
                </span>
              </div>
              <Progress value={dashboardData.systemMetrics.diskUsage} className="h-2" />
            </div>

            {/* Network Traffic */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">תעבורת רשת</span>
                <span className="text-sm font-bold text-blue-600">
                  {dashboardData.systemMetrics.networkTraffic} MB/s
                </span>
              </div>
              <Progress value={Math.min(dashboardData.systemMetrics.networkTraffic, 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                פעילות אחרונה
              </div>
              <Badge variant="outline" className="text-xs">
                {dashboardData.recentActivity.length} פעילויות
              </Badge>
            </CardTitle>
            <CardDescription>
              פעילות משתמשים ומערכת בזמן אמת
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">אין פעילות להצגה</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentActivity.slice(0, 8).map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full bg-gray-100`}>
                        <Icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(activity.created_at)}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-gray-400 mt-1">
                            {JSON.stringify(activity.details).substring(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Link to="/admin/analytics">
                <Button variant="outline" size="sm" className="w-full">
                  צפה בכל הפעילות
                  <ExternalLink className="h-4 w-4 mr-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              ביצועים מובילים
            </CardTitle>
            <CardDescription>
              המשתמשים והמודעות המובילות במערכת
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Top Users */}
              <div>
                <h4 className="text-sm font-medium mb-3">משתמשים פעילים</h4>
                <div className="space-y-2">
                  {dashboardData.topPerformers.topUsers.slice(0, 3).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm truncate">
                          {user.full_name || user.email}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {user.login_count || 0} כניסות
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Top Vehicles */}
              <div>
                <h4 className="text-sm font-medium mb-3">מודעות מובילות</h4>
                <div className="space-y-2">
                  {dashboardData.topPerformers.topVehicles.slice(0, 3).map((vehicle, index) => (
                    <div key={vehicle.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm truncate">
                          {vehicle.title}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {vehicle.views_count || 0} צפיות
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            פעולות מהירות
          </CardTitle>
          <CardDescription>
            פעולות ניהול נפוצות ומהירות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/users">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-gradient-to-r from-blue-50 to-amber-50">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="text-sm">ניהול משתמשים</span>
              </Button>
            </Link>
            
            <Link to="/admin/vehicles">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-green-50">
                <Car className="h-6 w-6 text-green-600" />
                <span className="text-sm">אישור מודעות</span>
                {dashboardData.overview.pendingVehicles > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {dashboardData.overview.pendingVehicles}
                  </Badge>
                )}
              </Button>
            </Link>
            
            <Link to="/admin/analytics">
              <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:bg-purple-50">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <span className="text-sm">דוחות ואנליטיקה</span>
              </Button>
            </Link>
            

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
