import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { vehicleService } from '@/services/vehicles';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Car,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  DollarSign,
  Star,
  Flag,
  MoreHorizontal,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Image,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Share2,
  Ban,
  Shield,
  Activity,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const statusConfig = {
  'pending': { label: 'ממתין לאישור', color: 'bg-yellow-500', icon: Clock, variant: 'secondary' },
  'approved': { label: 'מאושר', color: 'bg-green-500', icon: CheckCircle, variant: 'default' },
  'למכירה': { label: 'למכירה', color: 'bg-gradient-to-r from-blue-50 to-amber-500', icon: CheckCircle, variant: 'default' },
  'rejected': { label: 'נדחה', color: 'bg-red-500', icon: XCircle, variant: 'destructive' },
  'sold': { label: 'נמכר', color: 'bg-purple-500', icon: CheckCircle, variant: 'secondary' },
  'expired': { label: 'פג תוקף', color: 'bg-gray-500', icon: Clock, variant: 'outline' }
};

export default function VehiclesManagement() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    dateRange: 'all',
    priceRange: 'all'
  });
  
  // Statistics
  const [stats, setStats] = useState({
    totalVehicles: 0,
    pendingVehicles: 0,
    approvedVehicles: 0,
    rejectedVehicles: 0,
    soldVehicles: 0,
    todayVehicles: 0,
    weekVehicles: 0,
    totalViews: 0,
    avgPrice: 0
  });

  // Load vehicles data
  useEffect(() => {
    loadVehicles();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [filters, vehicles]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      
      const { data: vehiclesData, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          created_by_user:users!vehicles_created_by_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setVehicles(vehiclesData || []);
      calculateStats(vehiclesData || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: "שגיאה בטעינת מודעות",
        description: "לא ניתן לטעון את רשימת המודעות",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (vehiclesData) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const totalViews = vehiclesData.reduce((sum, v) => sum + (v.views_count || 0), 0);
    const totalPrice = vehiclesData.reduce((sum, v) => sum + (v.price || 0), 0);
    
    setStats({
      totalVehicles: vehiclesData.length,
      pendingVehicles: vehiclesData.filter(v => v.status === 'pending').length,
      approvedVehicles: vehiclesData.filter(v => v.status === 'approved' || v.status === 'למכירה').length,
      rejectedVehicles: vehiclesData.filter(v => v.status === 'rejected').length,
      soldVehicles: vehiclesData.filter(v => v.status === 'sold').length,
      todayVehicles: vehiclesData.filter(v => new Date(v.created_at) >= today).length,
      weekVehicles: vehiclesData.filter(v => new Date(v.created_at) >= weekAgo).length,
      totalViews,
      avgPrice: vehiclesData.length > 0 ? Math.round(totalPrice / vehiclesData.length) : 0
    });
  };

  const applyFilters = () => {
    let filtered = [...vehicles];
    
    // Search filter
    if (filters.search) {
      filtered = filtered.filter(vehicle => 
        vehicle.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.manufacturer?.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.created_by_user?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        vehicle.created_by_user?.email?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === filters.status);
    }
    
    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.type === filters.type);
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
        filtered = filtered.filter(vehicle => new Date(vehicle.created_at) >= startDate);
      }
    }
    
    // Price range filter
    if (filters.priceRange !== 'all') {
      const ranges = {
        'low': [0, 100000],
        'medium': [100000, 500000],
        'high': [500000, Infinity]
      };
      
      const [min, max] = ranges[filters.priceRange] || [0, Infinity];
      filtered = filtered.filter(vehicle => 
        vehicle.price >= min && vehicle.price < max
      );
    }
    
    setFilteredVehicles(filtered);
  };

  const handleApproveVehicle = async (vehicleId) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: 'למכירה',
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', vehicleId);
      
      if (error) throw error;
      
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, status: 'למכירה', approved_at: new Date().toISOString() }
          : vehicle
      ));
      
      toast({
        title: "מודעה אושרה",
        description: "המודעה אושרה ופורסמה בהצלחה",
      });
    } catch (error) {
      toast({
        title: "שגיאה באישור מודעה",
        description: "לא ניתן לאשר את המודעה",
        variant: "destructive"
      });
    }
  };

  const handleRejectVehicle = async () => {
    if (!selectedVehicle || !rejectionReason.trim()) return;
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString(),
          rejected_by: user.id
        })
        .eq('id', selectedVehicle.id);
      
      if (error) throw error;
      
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === selectedVehicle.id 
          ? { ...vehicle, status: 'rejected', rejection_reason: rejectionReason }
          : vehicle
      ));
      
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedVehicle(null);
      
      toast({
        title: "מודעה נדחתה",
        description: "המודעה נדחתה והמשתמש יקבל הודעה",
      });
    } catch (error) {
      toast({
        title: "שגיאה בדחיית מודעה",
        description: "לא ניתן לדחות את המודעה",
        variant: "destructive"
      });
    }
  };

  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;
    
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', selectedVehicle.id);
      
      if (error) throw error;
      
      setVehicles(prev => prev.filter(vehicle => vehicle.id !== selectedVehicle.id));
      setShowDeleteDialog(false);
      setSelectedVehicle(null);
      
      toast({
        title: "מודעה נמחקה",
        description: "המודעה נמחקה מהמערכת בהצלחה",
      });
    } catch (error) {
      toast({
        title: "שגיאה במחיקת מודעה",
        description: "לא ניתן למחוק את המודעה",
        variant: "destructive"
      });
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      type: 'all',
      dateRange: 'all',
      priceRange: 'all'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(price);
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
          <p className="text-gray-600">אין לך הרשאות לנהל מודעות.</p>
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
            <Car className="h-7 w-7 text-green-600" />
            ניהול מודעות רכב
          </h1>
          <p className="text-gray-600">אישור, עריכה ומחיקת מודעות רכב במערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadVehicles} disabled={loading}>
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
                <p className="text-sm font-medium text-blue-800">סך הכל מודעות</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalVehicles}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.weekVehicles} השבוע</p>
              </div>
              <Car className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">ממתינות לאישור</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingVehicles}</p>
                <p className="text-xs text-yellow-600 mt-1">דורשות טיפול</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">מודעות מאושרות</p>
                <p className="text-2xl font-bold text-green-600">{stats.approvedVehicles}</p>
                <p className="text-xs text-green-600 mt-1">פעילות</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">סך צפיות</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">כל המודעות</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>  
    {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            סינון מודעות
          </CardTitle>
          <CardDescription>
            סנן את המודעות לפי סטטוס, סוג רכב, תאריך ומחיר
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">חיפוש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="כותרת, יצרן, דגם..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pr-10"
                />
              </div>
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
                  <SelectItem value="pending">ממתין לאישור</SelectItem>
                  <SelectItem value="approved">מאושר</SelectItem>
                  <SelectItem value="למכירה">למכירה</SelectItem>
                  <SelectItem value="rejected">נדחה</SelectItem>
                  <SelectItem value="sold">נמכר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">סוג רכב</label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="משאית">משאית</SelectItem>
                  <SelectItem value="אוטובוס">אוטובוס</SelectItem>
                  <SelectItem value="מיניבוס">מיניבוס</SelectItem>
                  <SelectItem value="ציוד כבד">ציוד כבד</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">תאריך יצירה</label>
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

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">טווח מחירים</label>
              <Select 
                value={filters.priceRange} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר טווח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המחירים</SelectItem>
                  <SelectItem value="low">עד 100,000 ₪</SelectItem>
                  <SelectItem value="medium">100,000 - 500,000 ₪</SelectItem>
                  <SelectItem value="high">מעל 500,000 ₪</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              נקה סינון
            </Button>
            <Badge variant="secondary">
              {filteredVehicles.length} מתוך {vehicles.length} מודעות
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת מודעות</CardTitle>
          <CardDescription>
            ניהול וצפייה בכל המודעות במערכת
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-20 h-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">אין מודעות להצגה</h3>
              <p className="text-gray-600">
                {filters.search || filters.status !== 'all' || filters.type !== 'all' || filters.dateRange !== 'all' || filters.priceRange !== 'all'
                  ? 'לא נמצאו מודעות התואמות לסינון שנבחר'
                  : 'עדיין אין מודעות במערכת'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVehicles.map((vehicle) => {
                const statusInfo = statusConfig[vehicle.status] || statusConfig['pending'];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={vehicle.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    {/* Vehicle Image */}
                    <div className="w-20 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                      {vehicle.images && vehicle.images.length > 0 ? (
                        <img 
                          src={vehicle.images[0]} 
                          alt={vehicle.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Vehicle Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {vehicle.title}
                        </h4>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {vehicle.status === 'pending' && (
                          <Badge variant="destructive" className="text-xs animate-pulse">
                            דורש טיפול
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>{vehicle.manufacturer} {vehicle.model}</span>
                        <span>•</span>
                        <span>{vehicle.year}</span>
                        <span>•</span>
                        <span className="font-semibold text-green-600">
                          {formatPrice(vehicle.price)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {vehicle.created_by_user?.full_name || vehicle.created_by_user?.email || 'משתמש לא ידוע'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          נוצר {formatTimeAgo(vehicle.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {vehicle.views_count || 0} צפיות
                        </span>
                        {vehicle.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {vehicle.location}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Pending Actions */}
                      {vehicle.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveVehicle(vehicle.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                            אשר
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedVehicle(vehicle);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                            דחה
                          </Button>
                        </>
                      )}
                      
                      {/* View Details */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setShowVehicleDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        צפה
                      </Button>
                      
                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Details Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              פרטי מודעה
            </DialogTitle>
            <DialogDescription>
              צפייה מפורטת במודעה {selectedVehicle?.title}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVehicle && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">פרטי רכב</TabsTrigger>
                <TabsTrigger value="owner">בעלים</TabsTrigger>
                <TabsTrigger value="images">תמונות</TabsTrigger>
                <TabsTrigger value="actions">פעולות</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">כותרת</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">סטטוס</label>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusConfig[selectedVehicle.status]?.variant || 'secondary'}>
                        {statusConfig[selectedVehicle.status]?.label || selectedVehicle.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">יצרן</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.manufacturer}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">דגם</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.model}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">שנת ייצור</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">מחיר</label>
                    <p className="text-sm text-gray-900 font-semibold text-green-600">
                      {formatPrice(selectedVehicle.price)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">קילומטראז</label>
                    <p className="text-sm text-gray-900">
                      {selectedVehicle.kilometers?.toLocaleString() || 'לא צוין'} ק"מ
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">יד</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.hand || 'לא צוין'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">מיקום</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.location || 'לא צוין'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">צפיות</label>
                    <p className="text-sm text-gray-900">{selectedVehicle.views_count || 0}</p>
                  </div>
                </div>
                
                {selectedVehicle.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">תיאור</label>
                    <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded">
                      {selectedVehicle.description}
                    </p>
                  </div>
                )}
                
                {selectedVehicle.rejection_reason && (
                  <div>
                    <label className="text-sm font-medium text-red-700">סיבת דחייה</label>
                    <p className="text-sm text-red-900 mt-1 p-3 bg-red-50 rounded border border-red-200">
                      {selectedVehicle.rejection_reason}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="owner" className="space-y-4">
                {selectedVehicle.created_by_user ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">שם מלא</label>
                        <p className="text-sm text-gray-900">
                          {selectedVehicle.created_by_user.full_name || 'לא צוין'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">אימייל</label>
                        <p className="text-sm text-gray-900">{selectedVehicle.created_by_user.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">טלפון</label>
                        <p className="text-sm text-gray-900">
                          {selectedVehicle.created_by_user.phone || 'לא צוין'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        שלח אימייל
                      </Button>
                      {selectedVehicle.created_by_user.phone && (
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4 mr-2" />
                          התקשר
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">אין מידע על הבעלים</p>
                )}
              </TabsContent>
              
              <TabsContent value="images" className="space-y-4">
                {selectedVehicle.images && selectedVehicle.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVehicle.images.map((image, index) => (
                      <div key={index} className="aspect-video bg-gray-100 rounded overflow-hidden">
                        <img 
                          src={image} 
                          alt={`תמונה ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">אין תמונות למודעה זו</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-4">
                  {selectedVehicle.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          handleApproveVehicle(selectedVehicle.id);
                          setShowVehicleDialog(false);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        אשר מודעה
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setShowVehicleDialog(false);
                          setShowRejectDialog(true);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        דחה מודעה
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      צפה באתר
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-2" />
                      העתק קישור
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      שתף
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowVehicleDialog(false);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      מחק מודעה
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVehicleDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Vehicle Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>דחיית מודעה</DialogTitle>
            <DialogDescription>
              אנא ציין את הסיבה לדחיית המודעה "{selectedVehicle?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="הכנס את הסיבה לדחיית המודעה..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              ביטול
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectVehicle}
              disabled={!rejectionReason.trim()}
            >
              דחה מודעה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Vehicle Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מודעה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המודעה "{selectedVehicle?.title}"?
              פעולה זו תמחק את המודעה לצמיתות ולא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVehicle}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק מודעה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}