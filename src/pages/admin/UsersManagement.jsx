import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Phone,
  Calendar,
  Activity,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Settings,
  Lock,
  Unlock,
  Star,
  Flag,
  MessageSquare,
  Car
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function UsersManagement() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    dateRange: 'all'
  });
  
  // Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    newUsersToday: 0,
    newUsersWeek: 0,
    blockedUsers: 0,
    verifiedUsers: 0
  });

  // Load users data
  useEffect(() => {
    loadUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          *,
          vehicles:vehicles(count),
          messages_sent:messages!messages_sender_id_fkey(count),
          messages_received:messages!messages_recipient_id_fkey(count)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process users data
      const processedUsers = usersData.map(user => ({
        ...user,
        vehicle_count: user.vehicles?.[0]?.count || 0,
        messages_sent_count: user.messages_sent?.[0]?.count || 0,
        messages_received_count: user.messages_received?.[0]?.count || 0,
        total_messages: (user.messages_sent?.[0]?.count || 0) + (user.messages_received?.[0]?.count || 0)
      }));
      
      setUsers(processedUsers);
      calculateStats(processedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "שגיאה בטעינת משתמשים",
        description: "לא ניתן לטעון את רשימת המשתמשים",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersData) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    setStats({
      totalUsers: usersData.length,
      activeUsers: usersData.filter(u => u.is_active).length,
      adminUsers: usersData.filter(u => u.role === 'admin').length,
      newUsersToday: usersData.filter(u => new Date(u.created_at) >= today).length,
      newUsersWeek: usersData.filter(u => new Date(u.created_at) >= weekAgo).length,
      blockedUsers: usersData.filter(u => !u.is_active).length,
      verifiedUsers: usersData.filter(u => u.email_verified).length
    });
  };

  const applyFilters = () => {
    let filtered = [...users];
    
    // Search filter
    if (filters.search) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.phone?.includes(filters.search)
      );
    }
    
    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    
    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(user => user.is_active);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(user => !user.is_active);
      } else if (filters.status === 'verified') {
        filtered = filtered.filter(user => user.email_verified);
      }
    }
    
    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filtered = filtered.filter(user => new Date(user.created_at) >= startDate);
      }
    }
    
    setFilteredUsers(filtered);
  };

  const handleUpdateUserStatus = async (userId, isActive) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: isActive } : user
      ));
      
      toast({
        title: isActive ? "משתמש הופעל" : "משתמש הושבת",
        description: `המשתמש ${isActive ? 'הופעל' : 'הושבת'} בהצלחה`,
      });
    } catch (error) {
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: "לא ניתן לעדכן את סטטוס המשתמש",
        variant: "destructive"
      });
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      toast({
        title: "תפקיד עודכן",
        description: `תפקיד המשתמש עודכן ל${newRole === 'admin' ? 'מנהל' : 'משתמש רגיל'}`,
      });
    } catch (error) {
      toast({
        title: "שגיאה בעדכון תפקיד",
        description: "לא ניתן לעדכן את תפקיד המשתמש",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      setShowDeleteDialog(false);
      setSelectedUser(null);
      
      toast({
        title: "משתמש נמחק",
        description: "המשתמש נמחק מהמערכת בהצלחה",
      });
    } catch (error) {
      toast({
        title: "שגיאה במחיקת משתמש",
        description: "לא ניתן למחוק את המשתמש",
        variant: "destructive"
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      dateRange: 'all'
    });
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
          <p className="text-gray-600">אין לך הרשאות לנהל משתמשים.</p>
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
            <Users className="h-7 w-7 text-blue-600" />
            ניהול משתמשים
          </h1>
          <p className="text-gray-600">ניהול משתמשים, הרשאות ופרופילים במערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            ייצא נתונים
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">סך הכל משתמשים</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.activeUsers} פעילים</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">הרשמות השבוע</p>
                <p className="text-2xl font-bold text-green-600">{stats.newUsersWeek}</p>
                <p className="text-xs text-green-600 mt-1">{stats.newUsersToday} היום</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">משתמשים מאומתים</p>
                <p className="text-2xl font-bold text-purple-600">{stats.verifiedUsers}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {Math.round((stats.verifiedUsers / stats.totalUsers) * 100)}% מהכלל
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">משתמשים חסומים</p>
                <p className="text-2xl font-bold text-red-600">{stats.blockedUsers}</p>
                <p className="text-xs text-red-600 mt-1">{stats.adminUsers} מנהלים</p>
              </div>
              <Ban className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>      {/* Fi
lters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            סינון משתמשים
          </CardTitle>
          <CardDescription>
            סנן את המשתמשים לפי תפקיד, סטטוס ותאריך הרשמה
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="שם, אימייל או טלפון..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pr-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">תפקיד</label>
              <Select 
                value={filters.role} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התפקידים</SelectItem>
                  <SelectItem value="user">משתמש רגיל</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                  <SelectItem value="moderator">מנהל תוכן</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">סטטוס</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                  <SelectItem value="verified">מאומת</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">תאריך הרשמה</label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר טווח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התאריכים</SelectItem>
                  <SelectItem value="today">היום</SelectItem>
                  <SelectItem value="week">השבוע האחרון</SelectItem>
                  <SelectItem value="month">החודש האחרון</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              נקה סינון
            </Button>
            <Badge variant="secondary">
              {filteredUsers.length} מתוך {users.length} משתמשים
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת משתמשים</CardTitle>
          <CardDescription>
            ניהול וצפייה בכל המשתמשים במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">אין משתמשים להצגה</h3>
              <p className="text-gray-600">
                {filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.dateRange !== 'all'
                  ? 'לא נמצאו משתמשים התואמים לסינון שנבחר'
                  : 'עדיין אין משתמשים במערכת'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userData) => (
                <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userData.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-800">
                        {userData.full_name ? userData.full_name.charAt(0) : userData.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {userData.full_name || 'ללא שם'}
                        </h4>
                        <Badge variant={userData.role === 'admin' ? 'destructive' : 'secondary'} className="text-xs">
                          {userData.role === 'admin' ? 'מנהל' : 'משתמש'}
                        </Badge>
                        {userData.email_verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{userData.email}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          נרשם {formatTimeAgo(userData.created_at)}
                        </span>
                        {userData.last_login && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            כניסה אחרונה {formatTimeAgo(userData.last_login)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {userData.vehicle_count} מודעות
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {userData.total_messages} הודעות
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status and Actions */}
                  <div className="flex items-center gap-3">
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        userData.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">
                        {userData.is_active ? 'פעיל' : 'חסום'}
                      </span>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center gap-1">
                      {/* Toggle Status */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateUserStatus(userData.id, !userData.is_active)}
                        className={userData.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                      >
                        {userData.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                      
                      {/* Role Toggle */}
                      {userData.email !== 'zometauto@gmail.com' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateUserRole(userData.id, userData.role === 'admin' ? 'user' : 'admin')}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* View Details */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(userData);
                          setShowUserDialog(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {/* Delete User */}
                      {userData.email !== 'zometauto@gmail.com' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(userData);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              פרטי משתמש
            </DialogTitle>
            <DialogDescription>
              צפייה ועריכת פרטי המשתמש {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">פרופיל</TabsTrigger>
                <TabsTrigger value="activity">פעילות</TabsTrigger>
                <TabsTrigger value="settings">הגדרות</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-800 text-xl">
                      {selectedUser.full_name ? selectedUser.full_name.charAt(0) : selectedUser.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedUser.full_name || 'ללא שם'}</h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedUser.role === 'admin' ? 'destructive' : 'secondary'}>
                        {selectedUser.role === 'admin' ? 'מנהל' : 'משתמש'}
                      </Badge>
                      <Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>
                        {selectedUser.is_active ? 'פעיל' : 'חסום'}
                      </Badge>
                      {selectedUser.email_verified && (
                        <Badge variant="outline" className="text-green-600">
                          מאומת
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">טלפון</label>
                    <p className="text-sm text-gray-900">{selectedUser.phone || 'לא צוין'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">תאריך הרשמה</label>
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedUser.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">כניסה אחרונה</label>
                    <p className="text-sm text-gray-900">
                      {selectedUser.last_login 
                        ? format(new Date(selectedUser.last_login), 'dd/MM/yyyy HH:mm', { locale: he })
                        : 'מעולם לא נכנס'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">מספר כניסות</label>
                    <p className="text-sm text-gray-900">{selectedUser.login_count || 0}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Car className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-blue-600">{selectedUser.vehicle_count}</div>
                      <div className="text-sm text-gray-600">מודעות</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-600">{selectedUser.total_messages}</div>
                      <div className="text-sm text-gray-600">הודעות</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Activity className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-600">{selectedUser.login_count || 0}</div>
                      <div className="text-sm text-gray-600">כניסות</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">סטטוס חשבון</h4>
                      <p className="text-sm text-gray-600">הפעל או השבת את החשבון</p>
                    </div>
                    <Button
                      variant={selectedUser.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleUpdateUserStatus(selectedUser.id, !selectedUser.is_active)}
                    >
                      {selectedUser.is_active ? 'השבת חשבון' : 'הפעל חשבון'}
                    </Button>
                  </div>
                  
                  {selectedUser.email !== 'zometauto@gmail.com' && (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">הרשאות מנהל</h4>
                        <p className="text-sm text-gray-600">הענק או בטל הרשאות מנהל</p>
                      </div>
                      <Button
                        variant={selectedUser.role === 'admin' ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleUpdateUserRole(selectedUser.id, selectedUser.role === 'admin' ? 'user' : 'admin')}
                      >
                        {selectedUser.role === 'admin' ? 'בטל הרשאות מנהל' : 'הענק הרשאות מנהל'}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת משתמש</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשתמש "{selectedUser?.full_name || selectedUser?.email}"?
              פעולה זו תמחק את כל הנתונים הקשורים למשתמש ולא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק משתמש
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}