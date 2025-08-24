import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Car,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Image as ImageIcon,
  Flag,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  BarChart3,
  Star,
  Heart,
  Share2
} from 'lucide-react';

// Mock ad data - in real implementation, this would come from API
const mockAds = [
  {
    id: '1',
    title: 'טויוטה קמרי 2020 - מצב מעולה',
    description: 'רכב במצב מעולה, שמור מאוד, טסט עד 2025',
    price: 85000,
    year: 2020,
    make: 'טויוטה',
    model: 'קמרי',
    mileage: 45000,
    location: 'תל אביב',
    status: 'pending',
    created_at: '2024-02-10T10:00:00Z',
    updated_at: '2024-02-10T10:00:00Z',
    user: {
      id: '1',
      full_name: 'יוסי כהן',
      email: 'yossi@example.com',
      phone: '050-1234567'
    },
    images: [
      'https://via.placeholder.com/300x200?text=Car+1',
      'https://via.placeholder.com/300x200?text=Car+2'
    ],
    views: 234,
    likes: 12,
    shares: 3,
    reports: 0,
    promotion: null,
    quality_score: 85
  },
  {
    id: '2',
    title: 'הונדה סיוויק 2019 - חסכונית ואמינה',
    description: 'רכב חסכוני מאוד, מתאים לנהגים צעירים',
    price: 72000,
    year: 2019,
    make: 'הונדה',
    model: 'סיוויק',
    mileage: 62000,
    location: 'חיפה',
    status: 'approved',
    created_at: '2024-02-09T14:30:00Z',
    updated_at: '2024-02-09T15:00:00Z',
    user: {
      id: '2',
      full_name: 'שרה לוי',
      email: 'sarah@example.com',
      phone: '052-9876543'
    },
    images: [
      'https://via.placeholder.com/300x200?text=Honda+1'
    ],
    views: 456,
    likes: 28,
    shares: 7,
    reports: 1,
    promotion: {
      type: 'featured',
      expires_at: '2024-02-20T00:00:00Z'
    },
    quality_score: 92
  },
  {
    id: '3',
    title: 'מרצדס C200 2018 - יוקרה ונוחות',
    description: 'רכב יוקרה במצב טוב, עור, נווט',
    price: 145000,
    year: 2018,
    make: 'מרצדס',
    model: 'C200',
    mileage: 78000,
    location: 'ירושלים',
    status: 'rejected',
    created_at: '2024-02-08T09:15:00Z',
    updated_at: '2024-02-08T16:45:00Z',
    user: {
      id: '3',
      full_name: 'דוד מזרחי',
      email: 'david@example.com',
      phone: '053-5555555'
    },
    images: [],
    views: 89,
    likes: 5,
    shares: 1,
    reports: 2,
    promotion: null,
    quality_score: 45,
    rejection_reason: 'תמונות לא ברורות, מידע חסר'
  }
];

const AdCard = ({ ad, onApprove, onReject, onView, onEdit, onDelete, onPromote }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'מאושר';
      case 'pending': return 'ממתין';
      case 'rejected': return 'נדחה';
      default: return 'לא ידוע';
    }
  };

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Ad Image */}
          <div className="flex-shrink-0">
            {ad.images && ad.images.length > 0 ? (
              <img
                src={ad.images[0]}
                alt={ad.title}
                className="w-24 h-24 object-cover rounded-lg"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Ad Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate mb-1">
                  {ad.title}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getStatusColor(ad.status)}>
                    {getStatusText(ad.status)}
                  </Badge>
                  {ad.promotion && (
                    <Badge variant="outline" className="text-purple-600 border-purple-200">
                      <TrendingUp className="h-3 w-3 ml-1" />
                      מקודם
                    </Badge>
                  )}
                  {ad.reports > 0 && (
                    <Badge variant="destructive">
                      <Flag className="h-3 w-3 ml-1" />
                      {ad.reports} דיווחים
                    </Badge>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>פעולות</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onView(ad)}>
                    <Eye className="h-4 w-4 ml-2" />
                    צפה במודעה
                  </DropdownMenuItem>
                  {ad.status === 'pending' && (
                    <>
                      <DropdownMenuItem onClick={() => onApprove(ad)}>
                        <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                        אשר מודעה
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onReject(ad)}>
                        <XCircle className="h-4 w-4 ml-2 text-red-600" />
                        דחה מודעה
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onPromote(ad)}>
                    <TrendingUp className="h-4 w-4 ml-2" />
                    קדם מודעה
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(ad)}>
                    <Edit className="h-4 w-4 ml-2" />
                    ערוך מודעה
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(ad)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחק מודעה
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-lg text-blue-600">
                  ₪{ad.price.toLocaleString()}
                </span>
                <span>{ad.year} • {ad.make} {ad.model}</span>
                <span>{ad.mileage.toLocaleString()} ק"מ</span>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span>{ad.location}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>{ad.user.full_name}</span>
                <span>•</span>
                <span>{ad.user.phone}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>נוצר: {new Date(ad.created_at).toLocaleDateString('he-IL')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{ad.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span>{ad.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  <span>{ad.shares}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">איכות:</span>
                <span className={`text-xs font-medium ${getQualityColor(ad.quality_score)}`}>
                  {ad.quality_score}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ApprovalDialog = ({ ad, isOpen, onClose, onConfirm, type }) => {
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    onConfirm(ad, comment);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {type === 'approve' ? 'אישור מודעה' : 'דחיית מודעה'}
          </DialogTitle>
          <DialogDescription>
            {type === 'approve' 
              ? 'האם אתה בטוח שברצונך לאשר את המודעה?' 
              : 'אנא ציין את הסיבה לדחיית המודעה'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">{ad?.title}</h4>
            <p className="text-sm text-gray-600">{ad?.user?.full_name}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comment">
              {type === 'approve' ? 'הערה (אופציונלי)' : 'סיבת הדחייה'}
            </Label>
            <Textarea
              id="comment"
              placeholder={type === 'approve' 
                ? 'הערות נוספות למודעה...' 
                : 'אנא פרט את הסיבה לדחיית המודעה...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button 
            onClick={handleConfirm}
            className={type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {type === 'approve' ? 'אשר מודעה' : 'דחה מודעה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminAdManagementPage() {
  const [ads, setAds] = useState(mockAds);
  const [filteredAds, setFilteredAds] = useState(mockAds);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMake, setSelectedMake] = useState('all');
  const [selectedAd, setSelectedAd] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState({ isOpen: false, type: null });
  const [isLoading, setIsLoading] = useState(false);

  // Filter ads based on search and filters
  useEffect(() => {
    let filtered = ads;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ad =>
        ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(ad => ad.status === selectedStatus);
    }

    // Make filter
    if (selectedMake !== 'all') {
      filtered = filtered.filter(ad => ad.make === selectedMake);
    }

    setFilteredAds(filtered);
  }, [ads, searchTerm, selectedStatus, selectedMake]);

  const handleApprove = (ad, comment) => {
    setAds(ads.map(a => 
      a.id === ad.id 
        ? { ...a, status: 'approved', approval_comment: comment, updated_at: new Date().toISOString() }
        : a
    ));
  };

  const handleReject = (ad, reason) => {
    setAds(ads.map(a => 
      a.id === ad.id 
        ? { ...a, status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() }
        : a
    ));
  };

  const handleView = (ad) => {
    // Navigate to ad details page
  };

  const handleEdit = (ad) => {
    // Open edit dialog
  };

  const handleDelete = (ad) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המודעה "${ad.title}"?`)) {
      setAds(ads.filter(a => a.id !== ad.id));
    }
  };

  const handlePromote = (ad) => {
    // Open promotion dialog
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleExport = () => {
    // Implement export functionality
  };

  const stats = {
    total: ads.length,
    pending: ads.filter(a => a.status === 'pending').length,
    approved: ads.filter(a => a.status === 'approved').length,
    rejected: ads.filter(a => a.status === 'rejected').length,
    reported: ads.filter(a => a.reports > 0).length
  };

  const makes = [...new Set(ads.map(ad => ad.make))];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול מודעות</h1>
          <p className="text-gray-600 mt-1">אישור מודעות, בקרת תוכן וניהול קידומים</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            ייצא דוח
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">סך המודעות</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-gray-600">ממתינות</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">מאושרות</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-600">נדחו</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">דווחו</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.reported}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
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
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="pending">ממתין לאישור</SelectItem>
                <SelectItem value="approved">מאושר</SelectItem>
                <SelectItem value="rejected">נדחה</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedMake} onValueChange={setSelectedMake}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="יצרן" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל היצרנים</SelectItem>
                {makes.map(make => (
                  <SelectItem key={make} value={make}>{make}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">כל המודעות ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">ממתינות ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">מאושרות ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">נדחו ({stats.rejected})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredAds.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onApprove={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'approve' });
              }}
              onReject={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'reject' });
              }}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPromote={handlePromote}
            />
          ))}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredAds.filter(ad => ad.status === 'pending').map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onApprove={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'approve' });
              }}
              onReject={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'reject' });
              }}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPromote={handlePromote}
            />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {filteredAds.filter(ad => ad.status === 'approved').map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onApprove={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'approve' });
              }}
              onReject={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'reject' });
              }}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPromote={handlePromote}
            />
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {filteredAds.filter(ad => ad.status === 'rejected').map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              onApprove={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'approve' });
              }}
              onReject={(ad) => {
                setSelectedAd(ad);
                setApprovalDialog({ isOpen: true, type: 'reject' });
              }}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPromote={handlePromote}
            />
          ))}
        </TabsContent>
      </Tabs>

      {filteredAds.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              לא נמצאו מודעות
            </h3>
            <p className="text-gray-600">
              נסה לשנות את הפילטרים או החיפוש
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <ApprovalDialog
        ad={selectedAd}
        isOpen={approvalDialog.isOpen}
        type={approvalDialog.type}
        onClose={() => setApprovalDialog({ isOpen: false, type: null })}
        onConfirm={approvalDialog.type === 'approve' ? handleApprove : handleReject}
      />
    </div>
  );
}