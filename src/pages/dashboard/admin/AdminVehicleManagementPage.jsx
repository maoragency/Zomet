import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Car,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdminVehicleManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    sold: 0,
    rejected: 0
  });

  // Load vehicles data
  const loadVehicles = async () => {
    try {
      setLoading(true);
      
      const { data: vehiclesData, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          users!vehicles_created_by_fkey (
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVehicles(vehiclesData || []);
      
      // Calculate statistics
      const total = vehiclesData?.length || 0;
      const active = vehiclesData?.filter(v => v.status === 'למכירה')?.length || 0;
      const pending = vehiclesData?.filter(v => v.status === 'pending')?.length || 0;
      const sold = vehiclesData?.filter(v => v.status === 'sold')?.length || 0;
      const rejected = vehiclesData?.filter(v => v.status === 'rejected')?.length || 0;
      
      setStats({ total, active, pending, sold, rejected });
      
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת המודעות",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update vehicle status
  const updateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'vehicle_status_updated',
          resource_type: 'vehicle',
          resource_id: vehicleId,
          details: {
            new_status: newStatus,
            updated_by: user.email
          }
        });

      toast({
        title: "עודכן בהצלחה",
        description: `סטטוס המודעה עודכן ל${getStatusLabel(newStatus)}`,
      });

      loadVehicles();
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את סטטוס המודעה",
        variant: "destructive"
      });
    }
  };

  // Delete vehicle
  const deleteVehicle = async (vehicleId) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'vehicle_deleted',
          resource_type: 'vehicle',
          resource_id: vehicleId,
          details: {
            deleted_by: user.email
          }
        });

      toast({
        title: "נמחק בהצלחה",
        description: "המודעה נמחקה מהמערכת",
      });

      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את המודעה",
        variant: "destructive"
      });
    }
  };

  // Get status label and color
  const getStatusLabel = (status) => {
    const statusMap = {
      'למכירה': 'למכירה',
      'pending': 'ממתין לאישור',
      'sold': 'נמכר',
      'rejected': 'נדחה'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'למכירה': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'sold': 'bg-blue-100 text-blue-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Load data on component mount
  useEffect(() => {
    loadVehicles();
  }, []);

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">ניהול מודעות</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">ניהול מודעות</h1>
          <p className="text-gray-600 mt-1">
            ניהול וטיפול במודעות רכב במערכת
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">סך הכל</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">פעילות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ממתינות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">נמכרו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.sold}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">נדחו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            סינון וחיפוש
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="חיפוש לפי כותרת, יצרן, דגם או שם המוכר..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="סינון לפי סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="למכירה">למכירה</SelectItem>
                  <SelectItem value="pending">ממתין לאישור</SelectItem>
                  <SelectItem value="sold">נמכר</SelectItem>
                  <SelectItem value="rejected">נדחה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              רשימת מודעות ({filteredVehicles.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">אין מודעות להצגה</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'לא נמצאו מודעות התואמות לקריטריונים שנבחרו'
                  : 'עדיין לא נוספו מודעות למערכת'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {vehicle.title}
                        </h3>
                        <Badge className={getStatusColor(vehicle.status)}>
                          {getStatusLabel(vehicle.status)}
                        </Badge>
                        {vehicle.is_promoted && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            מקודם
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">יצרן ודגם:</span> {vehicle.manufacturer} {vehicle.model}
                        </div>
                        <div>
                          <span className="font-medium">שנה:</span> {vehicle.year}
                        </div>
                        <div>
                          <span className="font-medium">מחיר:</span> ₪{vehicle.price?.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">קילומטרים:</span> {vehicle.mileage?.toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">מוכר:</span> {vehicle.users?.full_name}
                        </div>
                        <div>
                          <span className="font-medium">טלפון:</span> {vehicle.users?.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{vehicle.views_count || 0} צפיות</span>
                        </div>
                        <div>
                          <span className="font-medium">נוצר:</span> {format(new Date(vehicle.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setShowVehicleDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 ml-1" />
                        צפה
                      </Button>
                      
                      {vehicle.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateVehicleStatus(vehicle.id, 'למכירה')}
                          >
                            <CheckCircle className="h-4 w-4 ml-1" />
                            אשר
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => updateVehicleStatus(vehicle.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 ml-1" />
                            דחה
                          </Button>
                        </>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4 ml-1" />
                            מחק
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                            <AlertDialogDescription>
                              פעולה זו תמחק את המודעה לצמיתות ולא ניתן יהיה לשחזר אותה.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVehicle(vehicle.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              מחק
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Details Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>פרטי מודעה</DialogTitle>
            <DialogDescription>
              צפייה מפורטת במודעה ובפרטי המוכר
            </DialogDescription>
          </DialogHeader>
          
          {selectedVehicle && (
            <div className="space-y-6">
              {/* Vehicle Images */}
              {selectedVehicle.images && selectedVehicle.images.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">תמונות הרכב</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedVehicle.images.slice(0, 6).map((image, index) => (
                      <div key={index} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={image}
                          alt={`תמונה ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Vehicle Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">פרטי הרכב</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">כותרת:</span> {selectedVehicle.title}</div>
                    <div><span className="font-medium">יצרן:</span> {selectedVehicle.manufacturer}</div>
                    <div><span className="font-medium">דגם:</span> {selectedVehicle.model}</div>
                    <div><span className="font-medium">שנה:</span> {selectedVehicle.year}</div>
                    <div><span className="font-medium">מחיר:</span> ₪{selectedVehicle.price?.toLocaleString()}</div>
                    <div><span className="font-medium">קילומטרים:</span> {selectedVehicle.mileage?.toLocaleString()}</div>
                    <div><span className="font-medium">סוג דלק:</span> {selectedVehicle.fuel_type}</div>
                    <div><span className="font-medium">תיבת הילוכים:</span> {selectedVehicle.transmission}</div>
                    <div><span className="font-medium">צבע:</span> {selectedVehicle.color}</div>
                    <div><span className="font-medium">מצב:</span> {selectedVehicle.condition}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">פרטי המוכר</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">שם:</span> {selectedVehicle.users?.full_name}</div>
                    <div><span className="font-medium">אימייל:</span> {selectedVehicle.users?.email}</div>
                    <div><span className="font-medium">טלפון:</span> {selectedVehicle.users?.phone}</div>
                    <div><span className="font-medium">עיר:</span> {selectedVehicle.city}</div>
                  </div>
                </div>
              </div>
              
              {/* Description */}
              {selectedVehicle.description && (
                <div>
                  <h4 className="font-semibold mb-3">תיאור</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedVehicle.description}
                  </p>
                </div>
              )}
              
              {/* Statistics */}
              <div>
                <h4 className="font-semibold mb-3">סטטיסטיקות</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="font-bold text-lg">{selectedVehicle.views_count || 0}</div>
                    <div className="text-gray-600">צפיות</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="font-bold text-lg">{selectedVehicle.favorites_count || 0}</div>
                    <div className="text-gray-600">מועדפים</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="font-bold text-lg">{selectedVehicle.messages_count || 0}</div>
                    <div className="text-gray-600">הודעות</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <Badge className={getStatusColor(selectedVehicle.status)}>
                      {getStatusLabel(selectedVehicle.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVehicleDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}