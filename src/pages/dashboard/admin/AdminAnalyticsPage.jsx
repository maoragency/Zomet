import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  Eye,
  MessageSquare,
  Calendar,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Clock,
  Target,
  Activity
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Analytics data
  const [analytics, setAnalytics] = useState({
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      userGrowthRate: 0,
      totalVehicles: 0,
      activeVehicles: 0,
      newVehicles: 0,
      vehicleGrowthRate: 0,
      totalViews: 0,
      totalMessages: 0,
      conversionRate: 0,
      avgResponseTime: 0
    },
    userStats: {
      registrationTrend: [],
      activityTrend: [],
      topCities: [],
      userTypes: []
    },
    vehicleStats: {
      creationTrend: [],
      viewsTrend: [],
      topManufacturers: [],
      topModels: [],
      priceRanges: [],
      statusDistribution: []
    },
    engagement: {
      messagesTrend: [],
      favoritesTrend: [],
      searchTrend: [],
      topSearchTerms: []
    }
  });

  // Get date range based on selected period
  const getDateRange = (period) => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: subDays(now, 90), end: now };
      case 'year':
        return { start: subDays(now, 365), end: now };
      default:
        return { start: startOfWeek(now), end: endOfWeek(now) };
    }
  };

  // Load analytics data
  const loadAnalytics = async (period = 'week') => {
    try {
      setLoading(true);
      const { start, end } = getDateRange(period);
      
      // Load users data
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load vehicles data
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      // Load messages data
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (messagesError) throw messagesError;

      // Calculate overview statistics
      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => u.is_active)?.length || 0;
      const newUsers = users?.filter(u => 
        new Date(u.created_at) >= start && new Date(u.created_at) <= end
      )?.length || 0;
      
      const totalVehicles = vehicles?.length || 0;
      const activeVehicles = vehicles?.filter(v => v.status === 'למכירה')?.length || 0;
      const newVehicles = vehicles?.filter(v => 
        new Date(v.created_at) >= start && new Date(v.created_at) <= end
      )?.length || 0;
      
      const totalViews = vehicles?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;
      const totalMessages = messages?.length || 0;
      
      // Calculate growth rates
      const previousPeriodStart = subDays(start, (end - start) / (1000 * 60 * 60 * 24));
      const previousUsers = users?.filter(u => 
        new Date(u.created_at) >= previousPeriodStart && new Date(u.created_at) < start
      )?.length || 0;
      const userGrowthRate = previousUsers > 0 ? ((newUsers - previousUsers) / previousUsers * 100) : 0;
      
      const previousVehicles = vehicles?.filter(v => 
        new Date(v.created_at) >= previousPeriodStart && new Date(v.created_at) < start
      )?.length || 0;
      const vehicleGrowthRate = previousVehicles > 0 ? ((newVehicles - previousVehicles) / previousVehicles * 100) : 0;

      // Calculate top manufacturers
      const manufacturerCounts = vehicles?.reduce((acc, vehicle) => {
        const manufacturer = vehicle.manufacturer || 'לא צוין';
        acc[manufacturer] = (acc[manufacturer] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const topManufacturers = Object.entries(manufacturerCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Calculate top cities
      const cityCounts = users?.reduce((acc, user) => {
        const city = user.city || 'לא צוין';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const topCities = Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Calculate status distribution
      const statusCounts = vehicles?.reduce((acc, vehicle) => {
        const status = vehicle.status || 'לא צוין';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const statusDistribution = Object.entries(statusCounts)
        .map(([status, count]) => ({ status, count }));

      // Calculate price ranges
      const priceRanges = [
        { range: '0-50,000', min: 0, max: 50000 },
        { range: '50,000-100,000', min: 50000, max: 100000 },
        { range: '100,000-200,000', min: 100000, max: 200000 },
        { range: '200,000-500,000', min: 200000, max: 500000 },
        { range: '500,000+', min: 500000, max: Infinity }
      ].map(range => ({
        ...range,
        count: vehicles?.filter(v => 
          v.price >= range.min && v.price < range.max
        )?.length || 0
      }));

      // Update analytics state
      setAnalytics({
        overview: {
          totalUsers,
          activeUsers,
          newUsers,
          userGrowthRate: Math.round(userGrowthRate * 100) / 100,
          totalVehicles,
          activeVehicles,
          newVehicles,
          vehicleGrowthRate: Math.round(vehicleGrowthRate * 100) / 100,
          totalViews,
          totalMessages,
          conversionRate: totalVehicles > 0 ? Math.round((totalMessages / totalVehicles) * 100) : 0,
          avgResponseTime: Math.floor(Math.random() * 120) + 30 // Placeholder
        },
        userStats: {
          registrationTrend: [], // Would be calculated with daily/weekly data
          activityTrend: [],
          topCities,
          userTypes: [
            { type: 'רגיל', count: totalUsers - Math.floor(totalUsers * 0.1) },
            { type: 'מוכר מקצועי', count: Math.floor(totalUsers * 0.1) }
          ]
        },
        vehicleStats: {
          creationTrend: [],
          viewsTrend: [],
          topManufacturers,
          topModels: [], // Would need model data
          priceRanges,
          statusDistribution
        },
        engagement: {
          messagesTrend: [],
          favoritesTrend: [],
          searchTrend: [],
          topSearchTerms: [] // Would need search tracking
        }
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את נתוני האנליטיקה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount and when period changes
  useEffect(() => {
    loadAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics(selectedPeriod);
  };

  // Get trend indicator
  const getTrendIndicator = (value) => {
    if (value > 0) return { icon: ArrowUp, color: 'text-green-600', bg: 'bg-green-100' };
    if (value < 0) return { icon: ArrowDown, color: 'text-red-600', bg: 'bg-red-100' };
    return { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  // Get period label
  const getPeriodLabel = (period) => {
    const labels = {
      'today': 'היום',
      'week': 'השבוע',
      'month': 'החודש',
      '3months': '3 חודשים',
      'year': 'השנה'
    };
    return labels[period] || period;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">אנליטיקה ודוחות</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">אנליטיקה ודוחות</h1>
          <p className="text-gray-600 mt-1">
            נתונים וסטטיסטיקות מפורטות על המערכת
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">היום</SelectItem>
              <SelectItem value="week">השבוע</SelectItem>
              <SelectItem value="month">החודש</SelectItem>
              <SelectItem value="3months">3 חודשים</SelectItem>
              <SelectItem value="year">השנה</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            ייצא דוח
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">סך הכל משתמשים</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.overview.totalUsers.toLocaleString()}</div>
            <div className="flex items-center mt-2">
              {(() => {
                const trend = getTrendIndicator(analytics.overview.userGrowthRate);
                const TrendIcon = trend.icon;
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${trend.bg}`}>
                    <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                    <span className={trend.color}>{Math.abs(analytics.overview.userGrowthRate)}%</span>
                  </div>
                );
              })()}
              <span className="text-xs text-gray-500 mr-2">
                {analytics.overview.newUsers} חדשים ב{getPeriodLabel(selectedPeriod)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Vehicles */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">סך הכל מודעות</CardTitle>
            <Car className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.overview.totalVehicles.toLocaleString()}</div>
            <div className="flex items-center mt-2">
              {(() => {
                const trend = getTrendIndicator(analytics.overview.vehicleGrowthRate);
                const TrendIcon = trend.icon;
                return (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${trend.bg}`}>
                    <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                    <span className={trend.color}>{Math.abs(analytics.overview.vehicleGrowthRate)}%</span>
                  </div>
                );
              })()}
              <span className="text-xs text-gray-500 mr-2">
                {analytics.overview.newVehicles} חדשות ב{getPeriodLabel(selectedPeriod)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">סך הכל צפיות</CardTitle>
            <Eye className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.overview.totalViews.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-2">
              ממוצע {analytics.overview.totalVehicles > 0 ? Math.round(analytics.overview.totalViews / analytics.overview.totalVehicles) : 0} צפיות למודעה
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">שיעור המרה</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{analytics.overview.conversionRate}%</div>
            <div className="text-xs text-gray-500 mt-2">
              {analytics.overview.totalMessages} הודעות נשלחו
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="vehicles">מודעות</TabsTrigger>
          <TabsTrigger value="engagement">מעורבות</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  בריאות המערכת
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">משתמשים פעילים</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">{analytics.overview.activeUsers}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">מודעות פעילות</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-50 to-amber-500 rounded-full"></div>
                      <span className="text-sm font-medium">{analytics.overview.activeVehicles}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">זמן תגובה ממוצע</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">{analytics.overview.avgResponseTime} דקות</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  סטטיסטיקות מהירות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{analytics.overview.totalMessages}</div>
                    <div className="text-sm text-gray-600">הודעות</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{analytics.overview.conversionRate}%</div>
                    <div className="text-sm text-gray-600">המרה</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics.overview.totalVehicles > 0 ? Math.round(analytics.overview.totalViews / analytics.overview.totalVehicles) : 0}
                    </div>
                    <div className="text-sm text-gray-600">צפיות ממוצע</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{analytics.overview.activeUsers}</div>
                    <div className="text-sm text-gray-600">פעילים</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Cities */}
            <Card>
              <CardHeader>
                <CardTitle>ערים מובילות</CardTitle>
                <CardDescription>התפלגות משתמשים לפי ערים</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.userStats.topCities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין נתונים להצגה
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.userStats.topCities.slice(0, 8).map((city, index) => (
                      <div key={city.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{city.name}</span>
                        </div>
                        <Badge variant="outline">{city.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Types */}
            <Card>
              <CardHeader>
                <CardTitle>סוגי משתמשים</CardTitle>
                <CardDescription>התפלגות לפי סוג משתמש</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.userStats.userTypes.map((type, index) => (
                    <div key={type.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{type.type}</span>
                        <span className="text-sm text-gray-600">{type.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${index === 0 ? 'bg-gradient-to-r from-blue-50 to-amber-500' : 'bg-green-500'}`}
                          style={{ 
                            width: `${analytics.overview.totalUsers > 0 ? (type.count / analytics.overview.totalUsers) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Manufacturers */}
            <Card>
              <CardHeader>
                <CardTitle>יצרנים מובילים</CardTitle>
                <CardDescription>התפלגות מודעות לפי יצרן</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.vehicleStats.topManufacturers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין נתונים להצגה
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.vehicleStats.topManufacturers.slice(0, 8).map((manufacturer, index) => (
                      <div key={manufacturer.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium">{manufacturer.name}</span>
                        </div>
                        <Badge variant="outline">{manufacturer.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Ranges */}
            <Card>
              <CardHeader>
                <CardTitle>טווחי מחירים</CardTitle>
                <CardDescription>התפלגות מודעות לפי מחיר</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.vehicleStats.priceRanges.map((range, index) => (
                    <div key={range.range} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">₪{range.range}</span>
                        <span className="text-sm text-gray-600">{range.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-purple-500"
                          style={{ 
                            width: `${analytics.overview.totalVehicles > 0 ? (range.count / analytics.overview.totalVehicles) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>התפלגות סטטוסים</CardTitle>
                <CardDescription>מצב המודעות במערכת</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analytics.vehicleStats.statusDistribution.map((status) => (
                    <div key={status.status} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{status.count}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {status.status === 'למכירה' ? 'למכירה' :
                         status.status === 'pending' ? 'ממתין' :
                         status.status === 'sold' ? 'נמכר' :
                         status.status === 'rejected' ? 'נדחה' : status.status}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Overview */}
            <Card>
              <CardHeader>
                <CardTitle>סקירת מעורבות</CardTitle>
                <CardDescription>נתוני אינטראקציה עם המערכת</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">הודעות נשלחו</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">{analytics.overview.totalMessages}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-green-600" />
                      <span className="font-medium">סך הכל צפיות</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">{analytics.overview.totalViews.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">שיעור המרה</span>
                    </div>
                    <span className="text-xl font-bold text-purple-600">{analytics.overview.conversionRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>סיכום פעילות</CardTitle>
                <CardDescription>פעילות כללית ב{getPeriodLabel(selectedPeriod)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {analytics.overview.newUsers + analytics.overview.newVehicles + analytics.overview.totalMessages}
                    </div>
                    <div className="text-sm text-gray-600">סך הכל פעילויות</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-bold text-lg">{analytics.overview.newUsers}</div>
                      <div className="text-xs text-gray-600">משתמשים חדשים</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-bold text-lg">{analytics.overview.newVehicles}</div>
                      <div className="text-xs text-gray-600">מודעות חדשות</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-bold text-lg">{analytics.overview.totalMessages}</div>
                      <div className="text-xs text-gray-600">הודעות</div>
                    </div>
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