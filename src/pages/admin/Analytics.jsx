import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  MessageSquare,
  Eye,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  PieChart,
  LineChart,
  Activity,
  Globe,
  Smartphone,
  Clock,
  Star,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  Zap,
  Shield
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

export default function Analytics() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalUsers: 0,
      totalVehicles: 0,
      totalMessages: 0,
      totalViews: 0,
      revenue: 0,
      conversionRate: 0,
      growthRate: 0,
      activeUsers: 0
    },
    trends: {
      userGrowth: [],
      vehicleGrowth: [],
      messageGrowth: [],
      viewsGrowth: [],
      revenueGrowth: []
    },
    demographics: {
      usersByLocation: [],
      usersByAge: [],
      deviceTypes: [],
      trafficSources: []
    },
    performance: {
      topVehicles: [],
      topUsers: [],
      popularCategories: [],
      searchTerms: []
    },
    systemMetrics: {
      responseTime: 0,
      uptime: 0,
      errorRate: 0,
      throughput: 0,
      activeConnections: 0
    }
  });

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate, endDate;
      
      switch (dateRange) {
        case 'today':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case '3months':
          startDate = subDays(now, 90);
          endDate = now;
          break;
        default:
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
      }
      
      // Load all analytics data in parallel
      const [
        overviewData,
        trendsData,
        demographicsData,
        performanceData,
        systemData
      ] = await Promise.all([
        loadOverviewData(startDate, endDate),
        loadTrendsData(startDate, endDate),
        loadDemographicsData(startDate, endDate),
        loadPerformanceData(startDate, endDate),
        loadSystemMetrics()
      ]);
      
      setAnalyticsData({
        overview: overviewData,
        trends: trendsData,
        demographics: demographicsData,
        performance: performanceData,
        systemMetrics: systemData
      });
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן לטעון את נתוני האנליטיקה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewData = async (startDate, endDate) => {
    try {
      // Load users data
      const { data: users } = await supabase
        .from('users')
        .select('id, created_at, last_login, is_active')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Load vehicles data
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, created_at, price, views_count, status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Load messages data
      const { data: messages } = await supabase
        .from('messages')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      // Calculate metrics
      const totalUsers = users?.length || 0;
      const totalVehicles = vehicles?.length || 0;
      const totalMessages = messages?.length || 0;
      const totalViews = vehicles?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;
      const revenue = vehicles?.filter(v => v.status === 'sold').reduce((sum, v) => sum + (v.price * 0.05), 0) || 0;
      const activeUsers = users?.filter(u => u.is_active).length || 0;
      const conversionRate = totalUsers > 0 ? Math.round((totalVehicles / totalUsers) * 100) : 0;
      
      // Calculate growth rate (mock for now)
      const growthRate = Math.floor(Math.random() * 20) - 10;
      
      return {
        totalUsers,
        totalVehicles,
        totalMessages,
        totalViews,
        revenue,
        conversionRate,
        growthRate,
        activeUsers
      };
    } catch (error) {
      console.error('Error loading overview data:', error);
      return {
        totalUsers: 0,
        totalVehicles: 0,
        totalMessages: 0,
        totalViews: 0,
        revenue: 0,
        conversionRate: 0,
        growthRate: 0,
        activeUsers: 0
      };
    }
  };

  const loadTrendsData = async (startDate, endDate) => {
    try {
      // Generate mock trend data (in real app, this would be calculated from actual data)
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const userGrowth = Array.from({ length: days }, (_, i) => ({
        date: format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'dd/MM'),
        value: Math.floor(Math.random() * 50) + 10
      }));
      
      const vehicleGrowth = Array.from({ length: days }, (_, i) => ({
        date: format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'dd/MM'),
        value: Math.floor(Math.random() * 30) + 5
      }));
      
      const messageGrowth = Array.from({ length: days }, (_, i) => ({
        date: format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'dd/MM'),
        value: Math.floor(Math.random() * 100) + 20
      }));
      
      const viewsGrowth = Array.from({ length: days }, (_, i) => ({
        date: format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'dd/MM'),
        value: Math.floor(Math.random() * 500) + 100
      }));
      
      const revenueGrowth = Array.from({ length: days }, (_, i) => ({
        date: format(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000), 'dd/MM'),
        value: Math.floor(Math.random() * 10000) + 2000
      }));
      
      return {
        userGrowth,
        vehicleGrowth,
        messageGrowth,
        viewsGrowth,
        revenueGrowth
      };
    } catch (error) {
      console.error('Error loading trends data:', error);
      return {
        userGrowth: [],
        vehicleGrowth: [],
        messageGrowth: [],
        viewsGrowth: [],
        revenueGrowth: []
      };
    }
  };

  const loadDemographicsData = async (startDate, endDate) => {
    try {
      // Mock demographics data
      return {
        usersByLocation: [
          { name: 'תל אביב', value: 35, count: 150 },
          { name: 'ירושלים', value: 25, count: 108 },
          { name: 'חיפה', value: 20, count: 86 },
          { name: 'באר שבע', value: 12, count: 52 },
          { name: 'אחר', value: 8, count: 34 }
        ],
        usersByAge: [
          { name: '18-25', value: 15, count: 65 },
          { name: '26-35', value: 35, count: 151 },
          { name: '36-45', value: 30, count: 129 },
          { name: '46-55', value: 15, count: 65 },
          { name: '55+', value: 5, count: 20 }
        ],
        deviceTypes: [
          { name: 'נייד', value: 70, count: 301 },
          { name: 'מחשב', value: 25, count: 108 },
          { name: 'טאבלט', value: 5, count: 21 }
        ],
        trafficSources: [
          { name: 'חיפוש אורגני', value: 45, count: 194 },
          { name: 'ישיר', value: 30, count: 129 },
          { name: 'רשתות חברתיות', value: 15, count: 65 },
          { name: 'פרסום', value: 10, count: 42 }
        ]
      };
    } catch (error) {
      console.error('Error loading demographics data:', error);
      return {
        usersByLocation: [],
        usersByAge: [],
        deviceTypes: [],
        trafficSources: []
      };
    }
  };

  const loadPerformanceData = async (startDate, endDate) => {
    try {
      // Load top vehicles
      const { data: topVehicles } = await supabase
        .from('vehicles')
        .select('id, title, views_count, price, manufacturer, model')
        .order('views_count', { ascending: false })
        .limit(10);
      
      // Load top users
      const { data: topUsers } = await supabase
        .from('users')
        .select('id, full_name, email, login_count')
        .order('login_count', { ascending: false })
        .limit(10);
      
      // Mock popular categories and search terms
      const popularCategories = [
        { name: 'משאיות', count: 145, percentage: 45 },
        { name: 'אוטובוסים', count: 89, percentage: 28 },
        { name: 'מיניבוסים', count: 56, percentage: 17 },
        { name: 'ציוד כבד', count: 32, percentage: 10 }
      ];
      
      const searchTerms = [
        { term: 'מרצדס', count: 234, trend: 'up' },
        { term: 'וולוו', count: 189, trend: 'up' },
        { term: 'סקניה', count: 156, trend: 'down' },
        { term: 'משאית', count: 145, trend: 'up' },
        { term: 'אוטובוס', count: 123, trend: 'stable' }
      ];
      
      return {
        topVehicles: topVehicles || [],
        topUsers: topUsers || [],
        popularCategories,
        searchTerms
      };
    } catch (error) {
      console.error('Error loading performance data:', error);
      return {
        topVehicles: [],
        topUsers: [],
        popularCategories: [],
        searchTerms: []
      };
    }
  };

  const loadSystemMetrics = async () => {
    try {
      // Mock system metrics
      return {
        responseTime: Math.floor(Math.random() * 200) + 100,
        uptime: 99.8,
        errorRate: Math.random() * 2,
        throughput: Math.floor(Math.random() * 1000) + 500,
        activeConnections: Math.floor(Math.random() * 100) + 50
      };
    } catch (error) {
      console.error('Error loading system metrics:', error);
      return {
        responseTime: 0,
        uptime: 0,
        errorRate: 0,
        throughput: 0,
        activeConnections: 0
      };
    }
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

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const exportData = () => {
    // Mock export functionality
    toast({
      title: "נתונים יוצאו",
      description: "הנתונים יוצאו בהצלחה לקובץ Excel",
    });
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">אין הרשאות מנהל</h2>
          <p className="text-gray-600">אין לך הרשאות לצפות באנליטיקה.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            דוחות ואנליטיקה
          </h1>
          <p className="text-gray-600">ניתוח מפורט של נתוני המערכת וביצועים</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="week">השבוע</SelectItem>
              <SelectItem value="month">החודש</SelectItem>
              <SelectItem value="3months">3 חודשים</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalyticsData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4" />
            ייצא
          </Button>
        </div>
      </div>   
   {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">משתמשים פעילים</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(analyticsData.overview.activeUsers)}
                </p>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {analyticsData.overview.growthRate >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={analyticsData.overview.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(analyticsData.overview.growthRate)}%
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">מודעות חדשות</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(analyticsData.overview.totalVehicles)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  שיעור המרה: {analyticsData.overview.conversionRate}%
                </p>
              </div>
              <Car className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">צפיות כולל</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(analyticsData.overview.totalViews)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  ממוצע לכל מודעה: {analyticsData.overview.totalVehicles > 0 ? Math.round(analyticsData.overview.totalViews / analyticsData.overview.totalVehicles) : 0}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">הכנסות</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(analyticsData.overview.revenue)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  עמלות מהמכירות
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="trends">מגמות</TabsTrigger>
          <TabsTrigger value="demographics">דמוגרפיה</TabsTrigger>
          <TabsTrigger value="performance">ביצועים</TabsTrigger>
          <TabsTrigger value="system">מערכת</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  מדדי ביצועים מרכזיים
                </CardTitle>
                <CardDescription>
                  המדדים החשובים ביותר למעקב
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">שיעור המרה</span>
                    <span className="text-sm font-bold text-blue-600">
                      {analyticsData.overview.conversionRate}%
                    </span>
                  </div>
                  <Progress value={analyticsData.overview.conversionRate} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">משתמשים פעילים</span>
                    <span className="text-sm font-bold text-green-600">
                      {Math.round((analyticsData.overview.activeUsers / analyticsData.overview.totalUsers) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((analyticsData.overview.activeUsers / analyticsData.overview.totalUsers) * 100)} 
                    className="h-2" 
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">יעילות מערכת</span>
                    <span className="text-sm font-bold text-purple-600">
                      {formatPercentage(analyticsData.systemMetrics.uptime)}
                    </span>
                  </div>
                  <Progress value={analyticsData.systemMetrics.uptime} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  סטטיסטיקות מהירות
                </CardTitle>
                <CardDescription>
                  נתונים עדכניים מהתקופה הנבחרת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(analyticsData.overview.totalUsers)}
                    </div>
                    <div className="text-sm text-blue-800">משתמשים חדשים</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(analyticsData.overview.totalVehicles)}
                    </div>
                    <div className="text-sm text-green-800">מודעות חדשות</div>
                  </div>
                  
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatNumber(analyticsData.overview.totalMessages)}
                    </div>
                    <div className="text-sm text-purple-800">הודעות נשלחו</div>
                  </div>
                  
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatNumber(analyticsData.overview.totalViews)}
                    </div>
                    <div className="text-sm text-orange-800">צפיות במודעות</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  גידול במשתמשים
                </CardTitle>
                <CardDescription>
                  מגמת הרשמות משתמשים חדשים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.trends.userGrowth.slice(-7).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(item.value / 50) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  גידול במודעות
                </CardTitle>
                <CardDescription>
                  מגמת פרסום מודעות חדשות
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.trends.vehicleGrowth.slice(-7).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(item.value / 30) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Messages Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  פעילות הודעות
                </CardTitle>
                <CardDescription>
                  מגמת שליחת הודעות במערכת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.trends.messageGrowth.slice(-7).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(item.value / 120) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  מגמת הכנסות
                </CardTitle>
                <CardDescription>
                  הכנסות יומיות מעמלות
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.trends.revenueGrowth.slice(-7).map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${(item.value / 12000) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">₪{Math.round(item.value / 1000)}K</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users by Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  משתמשים לפי מיקום
                </CardTitle>
                <CardDescription>
                  התפלגות גיאוגרפית של המשתמשים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.demographics.usersByLocation.map((location, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{location.name}</span>
                        <span className="text-sm text-gray-600">
                          {location.count} ({location.value}%)
                        </span>
                      </div>
                      <Progress value={location.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Device Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  סוגי מכשירים
                </CardTitle>
                <CardDescription>
                  התפלגות לפי סוג מכשיר
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.demographics.deviceTypes.map((device, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{device.name}</span>
                        <span className="text-sm text-gray-600">
                          {device.count} ({device.value}%)
                        </span>
                      </div>
                      <Progress value={device.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Users by Age */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  משתמשים לפי גיל
                </CardTitle>
                <CardDescription>
                  התפלגות גילאים
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.demographics.usersByAge.map((age, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{age.name}</span>
                        <span className="text-sm text-gray-600">
                          {age.count} ({age.value}%)
                        </span>
                      </div>
                      <Progress value={age.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  מקורות תעבורה
                </CardTitle>
                <CardDescription>
                  איך משתמשים מגיעים לאתר
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.demographics.trafficSources.map((source, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{source.name}</span>
                        <span className="text-sm text-gray-600">
                          {source.count} ({source.value}%)
                        </span>
                      </div>
                      <Progress value={source.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Vehicles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  מודעות מובילות
                </CardTitle>
                <CardDescription>
                  המודעות עם הכי הרבה צפיות
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.performance.topVehicles.slice(0, 5).map((vehicle, index) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 p-0 text-xs">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium truncate">{vehicle.title}</p>
                          <p className="text-xs text-gray-500">
                            {vehicle.manufacturer} {vehicle.model}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{vehicle.views_count || 0} צפיות</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(vehicle.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  קטגוריות פופולריות
                </CardTitle>
                <CardDescription>
                  הקטגוריות הנפוצות ביותר
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.popularCategories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm text-gray-600">
                          {category.count} ({category.percentage}%)
                        </span>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  משתמשים פעילים
                </CardTitle>
                <CardDescription>
                  המשתמשים הכי פעילים במערכת
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.performance.topUsers.slice(0, 5).map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 p-0 text-xs">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{user.login_count || 0} כניסות</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Search Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  מונחי חיפוש פופולריים
                </CardTitle>
                <CardDescription>
                  המונחים הנחפשים ביותר
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.performance.searchTerms.map((term, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 p-0 text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium">{term.term}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{term.count}</span>
                        {getTrendIcon(term.trend)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  ביצועי מערכת
                </CardTitle>
                <CardDescription>
                  מדדי ביצועים טכניים
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">זמן תגובה ממוצע</span>
                    <span className={`text-sm font-bold ${
                      analyticsData.systemMetrics.responseTime < 200 ? 'text-green-600' :
                      analyticsData.systemMetrics.responseTime < 500 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analyticsData.systemMetrics.responseTime}ms
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((analyticsData.systemMetrics.responseTime / 1000) * 100, 100)} 
                    className="h-2" 
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">זמינות מערכת</span>
                    <span className="text-sm font-bold text-green-600">
                      {formatPercentage(analyticsData.systemMetrics.uptime)}
                    </span>
                  </div>
                  <Progress value={analyticsData.systemMetrics.uptime} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">שיעור שגיאות</span>
                    <span className={`text-sm font-bold ${
                      analyticsData.systemMetrics.errorRate < 1 ? 'text-green-600' :
                      analyticsData.systemMetrics.errorRate < 3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(analyticsData.systemMetrics.errorRate)}
                    </span>
                  </div>
                  <Progress value={analyticsData.systemMetrics.errorRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  משאבי מערכת
                </CardTitle>
                <CardDescription>
                  ניצולת משאבים נוכחית
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(analyticsData.systemMetrics.throughput)}
                    </div>
                    <div className="text-sm text-blue-800">בקשות/דקה</div>
                  </div>
                  
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(analyticsData.systemMetrics.activeConnections)}
                    </div>
                    <div className="text-sm text-green-800">חיבורים פעילים</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}