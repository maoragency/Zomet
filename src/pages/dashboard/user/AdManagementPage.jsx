import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { vehicleService } from '@/services/vehicles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Car,
  Plus,
  Edit,
  Trash2,
  Copy,
  TrendingUp,
  Eye,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Share2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AdManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State management
  const [ads, setAds] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');
  const [selectedAd, setSelectedAd] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load user's ads from Supabase
  const loadAds = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const userAds = await vehicleService.getByUser(user.id, sortBy);
      setAds(userAds);
      setFilteredAds(userAds);
    } catch (error) {
      console.error('Error loading ads:', error);
      setError('שגיאה בטעינת המודעות');
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את המודעות. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load ads on component mount and when user changes
  useEffect(() => {
    loadAds();
  }, [user, sortBy]);

  // Filter and search ads
  useEffect(() => {
    let filtered = [...ads];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ad =>
        ad.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.model?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ad => ad.status === statusFilter);
    }

    setFilteredAds(filtered);
  }, [ads, searchTerm, statusFilter]);

  // Delete ad
  const handleDeleteAd = async (adId) => {
    try {
      setDeleteLoading(true);
      
      await vehicleService.delete(adId);
      
      // Remove from local state
      setAds(prev => prev.filter(ad => ad.id !== adId));
      setFilteredAds(prev => prev.filter(ad => ad.id !== adId));
      
      toast({
        title: "הצלחה",
        description: "המודעה נמחקה בהצלחה"
      });
      
      setShowDeleteDialog(false);
      setSelectedAd(null);
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן למחוק את המודעה. נסה שוב.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Duplicate ad
  const handleDuplicateAd = async (ad) => {
    try {
      const duplicatedAd = {
        ...ad,
        title: `${ad.title} - עותק`,
        status: 'draft',
        created_at: undefined,
        updated_at: undefined,
        id: undefined,
        views_count: 0
      };

      const newAd = await vehicleService.create(duplicatedAd);
      
      // Add to local state
      setAds(prev => [newAd, ...prev]);
      
      toast({
        title: "הצלחה",
        description: "המודעה שוכפלה בהצלחה"
      });
    } catch (error) {
      console.error('Error duplicating ad:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשכפל את המודעה. נסה שוב.",
        variant: "destructive"
      });
    }
  };

  // Update ad status
  const handleUpdateStatus = async (adId, newStatus) => {
    try {
      await vehicleService.update(adId, { status: newStatus });
      
      // Update local state
      setAds(prev => prev.map(ad => 
        ad.id === adId ? { ...ad, status: newStatus } : ad
      ));
      
      toast({
        title: "הצלחה",
        description: `סטטוס המודעה עודכן ל${getStatusText(newStatus)}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את סטטוס המודעה. נסה שוב.",
        variant: "destructive"
      });
    }
  };

  // Get status text in Hebrew
  const getStatusText = (status) => {
    const statusMap = {
      'active': 'פעילה',
      'pending': 'ממתינה לאישור',
      'draft': 'טיוטה',
      'expired': 'פגה תוקף',
      'sold': 'נמכר',
      'removed': 'הוסרה'
    };
    return statusMap[status] || status;
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'active':
      case 'למכירה':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'expired':
        return 'destructive';
      case 'sold':
        return 'success';
      default:
        return 'secondary';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: he });
    } catch {
      return 'תאריך לא זמין';
    }
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'לא צוין';
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-6 dashboard-minimal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">המודעות שלי</h1>
            <p className="text-sm text-gray-600">טוען מודעות...</p>
          </div>
          <div className="dashboard-spinner"></div>
        </div>
        <Card className="dashboard-card animate-pulse border-gray-200">
          <CardContent className="p-4">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="dashboard-card animate-pulse border-gray-200">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-200 rounded-lg mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
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
      <div className="space-y-6 dashboard-minimal">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">המודעות שלי</h1>
            <p className="text-sm text-gray-600">שגיאה בטעינת המודעות</p>
          </div>
          <Button onClick={loadAds} variant="outline" size="sm" className="border-gray-300">
            <RefreshCw className="h-4 w-4 ml-2" />
            נסה שוב
          </Button>
        </div>
        <Card className="dashboard-card bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">שגיאה בטעינת המודעות</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <Button onClick={loadAds} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <RefreshCw className="h-4 w-4 ml-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 dashboard-minimal">
      {/* Professional Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">המודעות שלי</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{filteredAds.length} מודעות מתוך {ads.length} סה"כ</span>
            {ads.length > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{ads.reduce((sum, ad) => sum + (ad.views_count || 0), 0).toLocaleString()} צפיות</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{ads.filter(a => a.status === 'למכירה').length} פעילות</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAds} variant="outline" size="sm" className="text-gray-600 border-gray-300 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
          <Link to="/AddVehicle">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="h-4 w-4 ml-2" />
              הוסף מודעה
            </Button>
          </Link>
        </div>
      </div>


      {/* Minimal Filters */}
      <Card className="dashboard-card border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="חפש מודעות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="w-full md:w-40">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue placeholder="כל הסטטוסים" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעילות</SelectItem>
                  <SelectItem value="למכירה">למכירה</SelectItem>
                  <SelectItem value="pending">ממתינות</SelectItem>
                  <SelectItem value="draft">טיוטות</SelectItem>
                  <SelectItem value="expired">פג תוקף</SelectItem>
                  <SelectItem value="sold">נמכרו</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-44">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">חדש לישן</SelectItem>
                  <SelectItem value="created_at">ישן לחדש</SelectItem>
                  <SelectItem value="-updated_at">עודכן לאחרונה</SelectItem>
                  <SelectItem value="title">כותרת א-ת</SelectItem>
                  <SelectItem value="-title">כותרת ת-א</SelectItem>
                  <SelectItem value="price">מחיר נמוך</SelectItem>
                  <SelectItem value="-price">מחיר גבוה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ads Grid */}
      {filteredAds.length === 0 ? (
        <Card className="dashboard-card border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
              <Car className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {ads.length === 0 ? 'אין לך מודעות עדיין' : 'לא נמצאו מודעות'}
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              {ads.length === 0 
                ? 'התחל ליצור את המודעה הראשונה שלך והתחל למכור רכבים'
                : 'נסה לשנות את הפילטרים או החיפוש כדי למצוא מודעות'
              }
            </p>
            {ads.length === 0 && (
              <Link to="/AddVehicle">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 ml-2" />
                  צור מודעה ראשונה
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAds.map((ad) => (
            <Card key={ad.id} className="dashboard-card group hover:shadow-md transition-all duration-200 border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate text-gray-900">{ad.title}</CardTitle>
                    <CardDescription className="text-sm text-gray-600 mt-1">
                      {ad.manufacturer} {ad.model} {ad.year && `• ${ad.year}`}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      variant={getStatusBadgeVariant(ad.status)}
                      className={`text-xs ${
                        ad.status === 'למכירה' || ad.status === 'active' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : ad.status === 'draft' 
                          ? 'bg-gray-100 text-gray-700 border-gray-200'
                          : ad.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}
                    >
                      {getStatusText(ad.status)}
                    </Badge>
                    {ad.has_active_promotion && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        <Star className="h-3 w-3 ml-1" />
                        מקודם
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Image */}
                <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  {ad.images && ad.images.length > 0 ? (
                    <img
                      src={ad.images[0]}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-gray-400" />
                    <span>{ad.views_count || 0} צפיות</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">{formatPrice(ad.price)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>{formatDate(ad.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>{formatDate(ad.updated_at)}</span>
                  </div>
                </div>

                <Separator className="bg-gray-100" />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/VehicleDetails?id=${ad.id}`)}
                      className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                      title="צפה במודעה"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/AddVehicle?edit=${ad.id}`)}
                      className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                      title="ערוך מודעה"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateAd(ad)}
                      className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50"
                      title="שכפל מודעה"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex gap-1">
                    {ad.status === 'active' || ad.status === 'למכירה' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(ad.id, 'draft')}
                        className="h-8 px-3 text-xs border-gray-300 hover:bg-gray-50"
                      >
                        השהה
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(ad.id, 'למכירה')}
                        className="h-8 px-3 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      >
                        הפעל
                      </Button>
                    )}
                    
                    <AlertDialog open={showDeleteDialog && selectedAd?.id === ad.id} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAd(ad)}
                          className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="מחק מודעה"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>מחיקת מודעה</AlertDialogTitle>
                          <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את המודעה "{selectedAd?.title}"?
                            פעולה זו לא ניתנת לביטול.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setSelectedAd(null)}>
                            ביטול
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteAd(selectedAd?.id)}
                            disabled={deleteLoading}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              'מחק'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}