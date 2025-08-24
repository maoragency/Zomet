import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Activity,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Search,
  Car,
  User,
  MessageSquare,
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Settings,
  Clock,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

export default function ActivityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load user activities
  const loadActivities = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get activities from Supabase
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply date filter
      if (dateRange.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data || []);
      setFilteredActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setError('שגיאה בטעינת הפעילות');
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את נתוני הפעילות. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load activities on component mount and when filters change
  useEffect(() => {
    loadActivities();
  }, [user, dateRange]);

  // Filter activities based on search and action filter
  useEffect(() => {
    let filtered = [...activities];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(activity.details || {}).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(activity => activity.action === actionFilter);
    }

    setFilteredActivities(filtered);
  }, [activities, searchTerm, actionFilter]);

  // Get action display text
  const getActionText = (action) => {
    const actionMap = {
      'ad_created': 'מודעה נוצרה',
      'ad_updated': 'מודעה עודכנה',
      'ad_deleted': 'מודעה נמחקה',
      'ad_viewed': 'מודעה נצפתה',
      'message_sent': 'הודעה נשלחה',
      'message_received': 'הודעה התקבלה',
      'profile_updated': 'פרופיל עודכן',
      'login': 'התחברות',
      'logout': 'התנתקות',
      'password_changed': 'סיסמה שונתה',
      'promotion_created': 'קידום נוצר',
      'promotion_expired': 'קידום פג',
      'vehicle_contact_clicked': 'לחיצה על פרטי קשר'
    };
    return actionMap[action] || action;
  };

  // Get action icon
  const getActionIcon = (action) => {
    switch (action) {
      case 'ad_created':
      case 'ad_updated':
      case 'ad_deleted':
      case 'ad_viewed':
        return Car;
      case 'message_sent':
      case 'message_received':
        return MessageSquare;
      case 'profile_updated':
      case 'password_changed':
        return User;
      case 'login':
      case 'logout':
        return Shield;
      case 'promotion_created':
      case 'promotion_expired':
        return TrendingUp;
      default:
        return Activity;
    }
  };

  // Get action badge variant
  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'ad_created':
      case 'promotion_created':
        return 'default';
      case 'ad_updated':
      case 'profile_updated':
        return 'secondary';
      case 'ad_deleted':
      case 'promotion_expired':
        return 'destructive';
      case 'login':
        return 'success';
      case 'logout':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Format date for display
  const formatActivityDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: he });
    } catch {
      return 'תאריך לא זמין';
    }
  };

  // Export activities to CSV
  const exportActivities = () => {
    const csvContent = [
      ['תאריך', 'פעולה', 'סוג משאב', 'פרטים'].join(','),
      ...filteredActivities.map(activity => [
        formatActivityDate(activity.created_at),
        getActionText(activity.action),
        activity.resource_type || '',
        JSON.stringify(activity.details || {}).replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">פעילות</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">פעילות</h1>
          <Button onClick={loadActivities} variant="outline">
            <RefreshCw className="h-4 w-4 ml-2" />
            נסה שוב
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">שגיאה בטעינת הפעילות</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadActivities}>
              <RefreshCw className="h-4 w-4 ml-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">פעילות</h1>
          <p className="text-gray-600">
            {filteredActivities.length} פעולות מתוך {activities.length} סה"כ
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadActivities} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
          <Button onClick={exportActivities} variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            ייצא
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">חיפוש</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="חפש בפעילות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="action">סוג פעולה</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="כל הפעולות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הפעולות</SelectItem>
                  <SelectItem value="ad_created">מודעות נוצרו</SelectItem>
                  <SelectItem value="ad_updated">מודעות עודכנו</SelectItem>
                  <SelectItem value="ad_deleted">מודעות נמחקו</SelectItem>
                  <SelectItem value="message_sent">הודעות נשלחו</SelectItem>
                  <SelectItem value="message_received">הודעות התקבלו</SelectItem>
                  <SelectItem value="profile_updated">פרופיל עודכן</SelectItem>
                  <SelectItem value="login">התחברויות</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label>טווח תאריכים</Label>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      'בחר טווח תאריכים'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {activities.length === 0 ? 'אין פעילות להצגה' : 'לא נמצאה פעילות'}
            </h3>
            <p className="text-gray-600">
              {activities.length === 0 
                ? 'התחל להשתמש במערכת כדי לראות את הפעילות שלך כאן'
                : 'נסה לשנות את הפילטרים או החיפוש'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity) => {
            const ActionIcon = getActionIcon(activity.action);
            
            return (
              <Card key={activity.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-gray-100">
                      <ActionIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {getActionText(activity.action)}
                        </h4>
                        <Badge variant={getActionBadgeVariant(activity.action)}>
                          {activity.resource_type || 'מערכת'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatActivityDate(activity.created_at)}
                        </p>
                        
                        {activity.details && Object.keys(activity.details).length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            {Object.entries(activity.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium">{key}:</span>
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-gray-500">
                      {activity.resource_id && (
                        <div>ID: {activity.resource_id.substring(0, 8)}...</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              סיכום פעילות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {activities.filter(a => a.action.includes('ad_')).length}
                </div>
                <div className="text-sm text-gray-600">פעולות מודעות</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {activities.filter(a => a.action.includes('message_')).length}
                </div>
                <div className="text-sm text-gray-600">פעולות הודעות</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {activities.filter(a => a.action === 'login').length}
                </div>
                <div className="text-sm text-gray-600">התחברויות</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {activities.filter(a => a.action.includes('profile_')).length}
                </div>
                <div className="text-sm text-gray-600">עדכוני פרופיל</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}