import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { vehicleService } from '@/services/vehicles';
import { messagingService } from '@/services/messaging';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Car,
  MessageSquare,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Target,
  Users,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  Activity,
  Zap
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [analytics, setAnalytics] = useState({
    overview: {
      totalViews: 0,
      totalAds: 0,
      totalMessages: 0,
      avgViewsPerAd: 0,
      conversionRate: 0
    },
    trends: {
      viewsGrowth: 0,
      adsGrowth: 0,
      messagesGrowth: 0
    },
    topPerformers: [],
    timeData: [],
    demographics: {
      viewsByHour: [],
      viewsByDay: [],
      popularBrands: []
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [timeFilter, setTimeFilter] = useState('30d');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load analytics data
  const loadAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's vehicles with analytics
      const vehiclesResponse = await vehicleService.getByUser(user.id);
      const vehicles = vehiclesResponse || [];

      // Get messages data
      const messagesResponse = await messagingService.getMessageStats();
      const messageStats = messagesResponse.success ? messagesResponse.data : {
        inbox: { total: 0, unread: 0 }
      };

      // Calculate analytics
      const totalViews = vehicles.reduce((sum, vehicle) => sum + (vehicle.views_count || 0), 0);
      const totalAds = vehicles.length;
      const totalMessages = messageStats.inbox.total || 0;
      const avgViewsPerAd = totalAds > 0 ? Math.round(totalViews / totalAds) : 0;

      // Mock conversion rate calculation (in real app, track actual conversions)
      const conversionRate = totalViews > 0 ? Math.round((totalMessages / totalViews) * 100 * 100) / 100 : 0;

      // Get top performing ads
      const topPerformers = vehicles
        .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 5)
        .map(vehicle => ({
          id: vehicle.id,
          title: vehicle.title,
          views: vehicle.views_count || 0,
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          price: vehicle.price,
          created_at: vehicle.created_at
        }));

      // Mock time-based data (in real app, get from database)
      const timeData = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(new Date(), 29 - i);
        return {
          date: format(date, 'yyyy-MM-dd'),
          views: Math.floor(Math.random() * 50) + 10,
          messages: Math.floor(Math.random() * 5) + 1
        };
      });

      // Mock demographics data
      const viewsByHour = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        views: Math.floor(Math.random() * 100) + 20
      }));

      const viewsByDay = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day, i) => ({
        day,
        views: Math.floor(Math.random() * 200) + 50
      }));

      const brandCounts = vehicles.reduce((acc, vehicle) => {
        const brand = vehicle.manufacturer || 'לא ידוע';
        acc[brand] = (acc[brand] || 0) + (vehicle.views_count || 0);
        return acc;
      }, {});

      const popularBrands = Object.entries(brandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([brand, views]) => ({ brand, views }));

      setAnalytics({
        overview: {
          totalViews,
          totalAds,
          totalMessages,
          avgViewsPerAd,
          conversionRate
        },
        trends: {
          viewsGrowth: Math.floor(Math.random() * 20) - 10, // Mock growth
          adsGrowth: Math.floor(Math.random() * 15) - 5,
          messagesGrowth: Math.floor(Math.random() * 25) - 10
        },
        topPerformers,
        timeData,
        demographics: {
          viewsByHour,
          viewsByDay,
          popularBrands
        }
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('שגיאה בטעינת הנתונים');
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את נתוני הסטטיסטיקות. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load analytics on component mount
  useEffect(() => {
    loadAnalytics();
  }, [user, timeFilter]);

  // Handle time filter change
  const handleTimeFilterChange = (value) => {
    setTimeFilter(value);

    let from, to = new Date();

    switch (value) {
      case '7d':
        from = subDays(new Date(), 7);
        break;
      case '30d':
        from = subDays(new Date(), 30);
        break;
      case '90d':
        from = subDays(new Date(), 90);
        break;
      case '1y':
        from = subMonths(new Date(), 12);
        break;
      default:
        from = subDays(new Date(), 30);
    }

    setDateRange({ from, to });
  };

  // Export analytics data
  const exportAnalytics = () => {
    const csvContent = [
      ['תאריך', 'צפיות', 'הודעות'].join(','),
      ...analytics.timeData.map(item => [
        item.date,
        item.views,
        item.messages
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render trend indicator
  const renderTrend = (value) => {
    const isPositive = value > 0;
    const isNegative = value < 0;

    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
        }`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : isNegative ? (
          <TrendingDown className="h-4 w-4" />
        ) : (
          <Activity className="h-4 w-4" />
        )}
        <span>{Math.abs(value)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-8 dashboard-minimal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">סטטיסטיקות וביצועים</h1>
            <p className="text-gray-600">טוען נתונים...</p>
          </div>
          <div className="dashboard-spinner"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="dashboard-card animate-pulse">
              <CardHeader className="pb-4">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 dashboard-minimal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">סטטיסטיקות וביצועים</h1>
            <p className="text-gray-600">שגיאה בטעינת הנתונים</p>
          </div>
          <Button onClick={loadAnalytics} variant="outline" className="border-gray-300">
            <RefreshCw className="h-4 w-4 ml-2" />
            נסה שוב
          </Button>
        </div>
        <Card className="dashboard-card bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
          <CardContent className="p-8 text-center">
            <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-red-900 mb-3">שגיאה בטעינת הנתונים</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <Button onClick={loadAnalytics} className="bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="h-4 w-4 ml-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 dashboard-minimal">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">סטטיסטיקות וביצועים</h1>
          <p className="text-gray-600">
            נתוני ביצועים מפורטים עבור המודעות שלך
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ימים</SelectItem>
              <SelectItem value="30d">30 ימים</SelectItem>
              <SelectItem value="90d">90 ימים</SelectItem>
              <SelectItem value="1y">שנה</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportAnalytics} variant="outline" className="border-gray-300">
            <Download className="h-4 w-4 ml-2" />
            ייצא נתונים
          </Button>
          <Button onClick={loadAnalytics} variant="outline" className="border-gray-300">
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="dashboard-card bg-gradient-to-br from-blue-50 to-blue-100 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              סך צפיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 mb-2">
              {analytics.overview.totalViews.toLocaleString()}
            </div>
            {renderTrend(analytics.trends.viewsGrowth)}
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-green-50 to-green-100 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <Car className="h-4 w-4" />
              מודעות פעילות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 mb-2">
              {analytics.overview.totalAds}
            </div>
            {renderTrend(analytics.trends.adsGrowth)}
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-purple-50 to-purple-100 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              הודעות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 mb-2">
              {analytics.overview.totalMessages}
            </div>
            {renderTrend(analytics.trends.messagesGrowth)}
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-orange-50 to-orange-100 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <Target className="h-4 w-4" />
              ממוצע צפיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 mb-2">
              {analytics.overview.avgViewsPerAd}
            </div>
            <div className="text-sm text-orange-600">למודעה</div>
          </CardContent>
        </Card>

        <Card className="dashboard-card bg-gradient-to-br from-amber-50 to-yellow-100 border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              שיעור המרה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 mb-2">
              {analytics.overview.conversionRate}%
            </div>
            <div className="text-sm text-amber-600">הודעות/צפיות</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Performing Ads */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              המודעות המובילות
            </CardTitle>
            <CardDescription>
              המודעות עם הכי הרבה צפיות
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topPerformers.length === 0 ? (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">אין מודעות להצגה</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topPerformers.map((ad, index) => (
                  <div key={ad.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{ad.title}</h4>
                      <p className="text-sm text-gray-600">
                        {ad.manufacturer} {ad.model}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{ad.views.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">צפיות</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Brands */}
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              יצרנים פופולריים
            </CardTitle>
            <CardDescription>
              היצרנים עם הכי הרבה צפיות
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.demographics.popularBrands.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">אין נתונים להצגה</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.demographics.popularBrands.map((brand, index) => {
                  const maxViews = Math.max(...analytics.demographics.popularBrands.map(b => b.views));
                  const percentage = maxViews > 0 ? (brand.views / maxViews) * 100 : 0;

                  return (
                    <div key={brand.brand} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{brand.brand}</span>
                        <span className="text-sm text-gray-600">{brand.views.toLocaleString()} צפיות</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time-based Analytics */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-500" />
            פעילות לפי זמן
          </CardTitle>
          <CardDescription>
            התפלגות הצפיות לפי שעות ביום
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2 mb-6">
            {analytics.demographics.viewsByHour.map((item) => {
              const maxViews = Math.max(...analytics.demographics.viewsByHour.map(h => h.views));
              const height = maxViews > 0 ? (item.views / maxViews) * 100 : 0;

              return (
                <div key={item.hour} className="text-center">
                  <div
                    className="bg-blue-500 rounded-t mx-auto mb-2 transition-all duration-300 hover:bg-blue-600"
                    style={{
                      height: `${Math.max(height, 5)}px`,
                      width: '20px'
                    }}
                    title={`${item.hour}:00 - ${item.views} צפיות`}
                  ></div>
                  <div className="text-xs text-gray-600">{item.hour}</div>
                </div>
              );
            })}
          </div>

          <Separator className="my-6" />

          <div>
            <h4 className="font-medium text-gray-900 mb-4">פעילות לפי ימי השבוע</h4>
            <div className="space-y-3">
              {analytics.demographics.viewsByDay.map((item) => {
                const maxViews = Math.max(...analytics.demographics.viewsByDay.map(d => d.views));
                const percentage = maxViews > 0 ? (item.views / maxViews) * 100 : 0;

                return (
                  <div key={item.day} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium text-gray-700">{item.day}</div>
                    <div className="flex-1">
                      <Progress value={percentage} className="h-3" />
                    </div>
                    <div className="w-16 text-sm text-gray-600 text-left">{item.views}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            סיכום ביצועים
          </CardTitle>
          <CardDescription>
            תובנות ומלצות לשיפור הביצועים
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-800 mb-2">ביצועים טובים</h3>
              <p className="text-sm text-green-600">
                המודעות שלך מקבלות תגובה טובה מהמשתמשים
              </p>
            </div>

            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-800 mb-2">המלצה</h3>
              <p className="text-sm text-blue-600">
                הוסף תמונות איכותיות יותר כדי להגדיל את מספר הצפיות
              </p>
            </div>

            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-800 mb-2">מעורבות</h3>
              <p className="text-sm text-purple-600">
                ענה מהר להודעות כדי לשפר את שיעור ההמרה
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}