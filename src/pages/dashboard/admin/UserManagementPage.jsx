import React, { useState, useEffect, useCallback } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Plus,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Smartphone,
  Monitor,
  Award,
  Target,
  Zap,
  Database,
  BarChart3
} from 'lucide-react';
import { format, formatDistanceToNow, subDays, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Enhanced state management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  
  // Enhanced statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    verified: 0,
    unverified: 0,
    admins: 0,
    newToday: 0,
    newThisWeek: 0,
    growth: 0,
    retention: 0
  });

  // Load users with enhanced filtering and sorting
  const loadUsers = useCallback(async () => {
    if (!user || user.email !== 'zometauto@gmail.com') return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('users')
        .select('*');

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }
      
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      // Apply search
      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data: usersData, error } = await query;

      if (error) throw error;

      setUsers(usersData || []);

      // Calculate enhanced statistics
      const now = new Date();
      const today = startOfDay(now);
      const weekAgo = subDays(now, 7);

      const total = usersData?.length || 0;
      const active = usersData?.filter(u => u.is_active)?.length || 0;
      const inactive = total - active;
      const verified = usersData?.filter(u => u.email_verified)?.length || 0;
      const unverified = total - verified;
      const admins = usersData?.filter(u => u.role === 'admin')?.length || 0;
      const newToday = usersData?.filter(u => new Date(u.created_at) >= today)?.length || 0;
      const newThisWeek = usersData?.filter(u => new Date(u.created_at) >= weekAgo)?.length || 0;
      
      // Calculate growth (mock calculation)
      const lastWeekUsers = usersData?.filter(u => 
        new Date(u.created_at) >= subDays(weekAgo, 7) && 
        new Date(u.created_at) < weekAgo
      )?.length || 0;
      
      const growth = lastWeekUsers > 0 ? ((newThisWeek - lastWeekUsers) / lastWeekUsers * 100) : 100;
      
      // Calculate retention (users active in last 7 days)
      const activeLastWeek = usersData?.filter(u => 
        u.last_login && new Date(u.last_login) >= weekAgo
      )?.length || 0;
      
      const retention = total > 0 ? (activeLastWeek / total * 100) : 0;

      setStats({
        total,
        active,
        inactive,
        verified,
        unverified,
        admins,
        newToday,
        newThisWeek,
        growth,
        retention
      });

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
  }, [user, searchTerm, statusFilter, roleFilter, sortBy, sortOrder, toast]);

  // Load users on component mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle user status toggle
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "סטטוס משתמש עודכן",
        description: `המשתמש ${!currentStatus ? 'הופעל' : 'הושבת'} בהצלחה`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: "לא ניתן לעדכן את סטטוס המשתמש",
        variant: "destructive"
      });
    }
  };

  // Handle user role change
  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "תפקיד משתמש עודכן",
        description: `התפקיד עודכן ל-${newRole} בהצלחה`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "שגיאה בעדכון תפקיד",
        description: "לא ניתן לעדכן את תפקיד המשתמש",
        variant: "destructive"
      });
    }
  };

  // Handle user deletion
  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "משתמש נמחק",
        description: "המשתמש נמחק בהצלחה מהמערכת",
      });

      loadUsers();
      setShowDeleteDialog(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "שגיאה במחיקת משתמש",
        description: "לא ניתן למחוק את המשתמש",
        variant: "destructive"
      });
    }
  };

  // Filter and paginate users
  const filteredUsers = users;
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  // Get user status badge
  const getUserStatusBadge = (user) => {
    if (!user.is_active) {
      return <Badge variant="destructive">לא פעיל</Badge>;
    }
    if (!user.email_verified) {
      return <Badge variant="secondary">לא מאומת</Badge>;
    }
    return <Badge className="bg-green-500">פעיל</Badge>;
  };

  // Get user role badge
  const getUserRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500"><Shield className="h-3 w-3 mr-1" />מנהל</Badge>;
      case 'moderator':
        return <Badge className="bg-orange-500"><Star className="h-3 w-3 mr-1" />מנהל תוכן</Badge>;
      default:
        return <Badge variant="outline">משתמש</Badge>;
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
          <Button disabled>
            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
            טוען...
          </Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
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

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-white min-h-screen">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
            ניהול משתמשים מתקדם
          </h1>
          <p className="text-slate-600 text-lg">
            ניהול מקצועי של כל המשתמשים בפלטפורמה • {stats.total} משתמשים רשומים
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadUsers} variant="outline" className="shadow-sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן נתונים
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
            <Plus className="h-4 w-4 ml-2" />
            הוסף משתמש
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">סך הכל משתמשים</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-1">{stats.total.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                {stats.active} פעילים
              </Badge>
              {stats.newToday > 0 && (
                <Badge className="bg-green-500 text-white">
                  +{stats.newToday} היום
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center text-xs text-blue-600">
              {stats.growth > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : stats.growth < 0 ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : (
                <Minus className="h-3 w-3 mr-1" />
              )}
              {Math.abs(stats.growth).toFixed(1)}% השבוע
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">משתמשים פעילים</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-1">{stats.active.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-green-200 text-green-800">
                {((stats.active / stats.total) * 100 || 0).toFixed(1)}% מהכלל
              </Badge>
            </div>
            <div className="mt-2 text-xs text-green-600">
              שיעור שימור: {stats.retention.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">משתמשים מאומתים</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-1">{stats.verified.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                {((stats.verified / stats.total) * 100 || 0).toFixed(1)}% מאומתים
              </Badge>
            </div>
            <div className="mt-2 text-xs text-purple-600">
              {stats.unverified} לא מאומתים
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">משתמשים חדשים</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Star className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-1">{stats.newThisWeek.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="bg-orange-200 text-orange-800">
                השבוע
              </Badge>
              {stats.newToday > 0 && (
                <Badge className="bg-green-500 text-white">
                  {stats.newToday} היום
                </Badge>
              )}
            </div>
            <div className="mt-2 text-xs text-orange-600">
              {stats.admins} מנהלים במערכת
            </div>
          </CardContent>
        </Card>
      </div>      {/* 
Enhanced Filters and Search */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500" />
            חיפוש וסינון מתקדם
          </CardTitle>
          <CardDescription>
            חפש וסנן משתמשים לפי קריטריונים שונים
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם, אימייל או טלפון..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="active">פעילים</SelectItem>
                <SelectItem value="inactive">לא פעילים</SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="תפקיד" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התפקידים</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
                <SelectItem value="moderator">מנהל תוכן</SelectItem>
                <SelectItem value="user">משתמש</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="מיון לפי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">תאריך הצטרפות</SelectItem>
                <SelectItem value="last_login">התחברות אחרונה</SelectItem>
                <SelectItem value="full_name">שם</SelectItem>
                <SelectItem value="email">אימייל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Database className="h-4 w-4" />
              מציג {paginatedUsers.length} מתוך {filteredUsers.length} משתמשים
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? 'עולה' : 'יורד'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ייצא
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Users Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            רשימת משתמשים
          </CardTitle>
          <CardDescription>
            ניהול מפורט של כל המשתמשים במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-right">משתמש</TableHead>
                  <TableHead className="text-right">פרטי קשר</TableHead>
                  <TableHead className="text-right">תפקיד</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">הצטרפות</TableHead>
                  <TableHead className="text-right">פעילות אחרונה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((userData) => (
                  <TableRow key={userData.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userData.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                            {userData.full_name ? userData.full_name.charAt(0) : userData.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{userData.full_name || 'ללא שם'}</div>
                          <div className="text-sm text-slate-500">{userData.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[200px]">{userData.email}</span>
                        </div>
                        {userData.phone && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{userData.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {getUserRoleBadge(userData.role)}
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {getUserStatusBadge(userData)}
                        {userData.email_verified && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            מאומת
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(userData.created_at), 'dd/MM/yyyy', { locale: he })}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(userData.created_at), { addSuffix: true, locale: he })}
                      </div>
                    </TableCell>

                    <TableCell>
                      {userData.last_login ? (
                        <div className="text-sm">
                          <div>{formatDistanceToNow(new Date(userData.last_login), { addSuffix: true, locale: he })}</div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(userData.last_login), 'dd/MM HH:mm', { locale: he })}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          מעולם לא התחבר
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>פעולות משתמש</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => setSelectedUser(userData)}>
                            <Eye className="h-4 w-4 mr-2" />
                            צפה בפרטים
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem onClick={() => setShowUserDialog(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            ערוך משתמש
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => toggleUserStatus(userData.id, userData.is_active)}
                          >
                            {userData.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                השבת משתמש
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                הפעל משתמש
                              </>
                            )}
                          </DropdownMenuItem>

                          {userData.role !== 'admin' && (
                            <DropdownMenuItem 
                              onClick={() => updateUserRole(userData.id, userData.role === 'user' ? 'moderator' : 'user')}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {userData.role === 'user' ? 'הפוך למנהל תוכן' : 'הפוך למשתמש רגיל'}
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {userData.email !== 'zometauto@gmail.com' && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setUserToDelete(userData);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              מחק משתמש
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-600">
                עמוד {currentPage} מתוך {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  הקודם
                </Button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  הבא
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                פרטי משתמש מלאים
              </DialogTitle>
              <DialogDescription>
                מידע מפורט על המשתמש {selectedUser.full_name || selectedUser.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* User Profile */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl">
                    {selectedUser.full_name ? selectedUser.full_name.charAt(0) : selectedUser.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedUser.full_name || 'ללא שם'}</h3>
                  <p className="text-slate-600">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getUserRoleBadge(selectedUser.role)}
                    {getUserStatusBadge(selectedUser)}
                  </div>
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">פרטי קשר</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{selectedUser.email}</span>
                      </div>
                      {selectedUser.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{selectedUser.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">סטטוס חשבון</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>פעיל:</span>
                        <Badge variant={selectedUser.is_active ? "default" : "destructive"}>
                          {selectedUser.is_active ? 'כן' : 'לא'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>אימייל מאומת:</span>
                        <Badge variant={selectedUser.email_verified ? "default" : "secondary"}>
                          {selectedUser.email_verified ? 'כן' : 'לא'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">תאריכים חשובים</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>הצטרף: {format(new Date(selectedUser.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                      </div>
                      {selectedUser.last_login && (
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-4 w-4 text-slate-400" />
                          <span>התחבר לאחרונה: {format(new Date(selectedUser.last_login), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                        </div>
                      )}
                      {selectedUser.updated_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>עודכן: {format(new Date(selectedUser.updated_at), 'dd/MM/yyyy HH:mm', { locale: he })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">מידע נוסף</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>תפקיד:</span>
                        <span className="font-medium">{selectedUser.role}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>מזהה משתמש:</span>
                        <span className="font-mono text-xs">{selectedUser.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                סגור
              </Button>
              <Button onClick={() => {
                setShowUserDialog(true);
                setSelectedUser(null);
              }}>
                ערוך משתמש
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              מחיקת משתמש
            </AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשתמש {userToDelete?.full_name || userToDelete?.email}?
              פעולה זו לא ניתנת לביטול ותמחק את כל הנתונים הקשורים למשתמש.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUser(userToDelete.id)}
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