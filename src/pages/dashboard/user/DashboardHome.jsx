import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { vehicleService } from '@/services/vehicles';
import { messagingService } from '@/services/messaging';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Activity,
  Car,
  MessageSquare,
  Plus,
  TrendingUp,
  Eye,
  Calendar,
  ArrowLeft,
  Star,
  Mail,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardHome() {
  const { user } = useAuth();

  // Simple stats for user dashboard
  const [stats, setStats] = useState({
    totalAds: 0,
    activeAds: 0,
    views: 0,
    messages: 0,
    todayViews: 0,
    weekViews: 0,
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dashboard stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get user's vehicle stats
        const vehicleResponse = await vehicleService.getByUser(user.id);
        const vehicles = vehicleResponse || [];
        
        // Get message stats
        const messageResponse = await messagingService.getMessageStats();
        const messageStats = messageResponse.success ? messageResponse.data : { 
          inbox: { total: 0, unread: 0 },
          sent: { total: 0 }
        };
        
        // Calculate total views
        const totalViews = vehicles.reduce((sum, vehicle) => sum + (vehicle.views_count || 0), 0);
        
        setStats({
          totalAds: vehicles.length,
          activeAds: vehicles.filter(v => v.status === 'למכירה').length,
          views: totalViews,
          messages: messageStats.inbox.unread || 0,
          todayViews: Math.floor(totalViews * 0.1), // Simplified calculation
          weekViews: Math.floor(totalViews * 0.3),
          recentActivity: vehicles.slice(0, 5).map(v => ({
            type: 'ad_created',
            title: v.title,
            timestamp: v.created_at,
            views: v.views_count || 0
          }))
        });
        
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        setError('שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 300000);
    return () => clearInterval(interval);
  }, [user]);

  // Helper function to format time ago
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
    
    return format(date, 'dd/MM/yyyy');
  };

  return (
    <div className="space-y-4 dashboard-minimal">
      {/* Compact Welcome Section */}
      <div className="mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            שלום, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'משתמש'} 👋
          </h1>
          <p className="text-gray-600">
            ברוך הבא ללוח הבקרה שלך. כאן תוכל לנהל את המודעות והפעילות שלך
          </p>
        </div>
      </div>

      {/* Professional Statistics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse dashboard-card">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="dashboard-card border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 font-medium mb-3">{error}</div>
            <Button onClick={() => window.location.reload()} variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Ads */}
          <Card className="dashboard-card dashboard-animate-in bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2">סך המודעות</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalAds}</p>
                  <p className="text-xs text-blue-600 mt-1">מודעות פעילות</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-xl">
                  <Car className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="dashboard-card dashboard-animate-in bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-2">הודעות חדשות</p>
                  <p className="text-3xl font-bold text-purple-900">{stats.messages}</p>
                  <p className="text-xs text-purple-600 mt-1">ממתינות לתשובה</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="dashboard-card dashboard-animate-in bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-2">ממוצע צפיות</p>
                  <p className="text-3xl font-bold text-amber-900">
                    {stats.totalAds > 0 ? Math.round(stats.views / stats.totalAds) : 0}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">לכל מודעה</p>
                </div>
                <div className="p-3 bg-amber-200 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Compact Quick Actions Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/dashboard/messages">
            <Card className="dashboard-card group cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:border-purple-300">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <MessageSquare className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-purple-900 mb-2">הודעות</h3>
                <p className="text-sm text-purple-700">
                  {stats.messages > 0 ? `${stats.messages} הודעות חדשות ממתינות` : 'אין הודעות חדשות'}
                </p>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/dashboard/profile">
            <Card className="dashboard-card group cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300">
              <CardContent className="p-6 text-center">
                <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-900 mb-2">פרופיל אישי</h3>
                <p className="text-sm text-green-700">עדכן פרטים אישיים והגדרות חשבון</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <Card className="dashboard-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              פעילות אחרונה
            </CardTitle>
            <CardDescription className="text-gray-600">
              המודעות האחרונות שפרסמת
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                  <Car className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">אין מודעות עדיין</h3>
                <p className="text-sm text-gray-500 mb-4">התחל ליצור מודעות ותראה אותן כאן</p>
                <p className="text-xs text-gray-400">ניתן להוסיף מודעות דרך הnavbar הראשי</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 3).map((activity, index) => (
                  <div 
                    key={`${activity.type}-${index}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Car className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <Eye className="h-4 w-4" />
                        {activity.views} צפיות
                        <span>•</span>
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                
                <Link to="/dashboard/ads">
                  <Button variant="outline" className="w-full mt-4">
                    צפה בכל המודעות
                    <ArrowLeft className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="dashboard-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="h-5 w-5 text-green-600" />
              </div>
              סטטוס החשבון
            </CardTitle>
            <CardDescription className="text-gray-600">
              מידע על מצב החשבון שלך
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-white rounded">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">כתובת אימייל</span>
                </div>
                <Badge variant={user?.email_verified ? "default" : "destructive"}>
                  {user?.email_verified ? "מאומת" : "לא מאומת"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-white rounded">
                    <Star className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">סוג חשבון</span>
                </div>
                <Badge variant="secondary">
                  {user?.role === 'admin' ? 'מנהל מערכת' : 'משתמש רגיל'}
                </Badge>
              </div>
              
              <Link to="/dashboard/profile">
                <Button variant="outline" className="w-full mt-4">
                  <Settings className="h-4 w-4 ml-2" />
                  עדכן הגדרות חשבון
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}