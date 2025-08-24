import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  Megaphone,
  DollarSign,
  Calendar,
  Eye,
  Target,
  BarChart3,
  PieChart,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  RefreshCw,
  Download,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Zap,
  Crown,
  Award,
  Users,
  Car,
  MousePointer,
  TrendingDown
} from 'lucide-react';

// Mock promotion data
const mockPromotions = [
  {
    id: '1',
    title: 'קידום פרימיום - חבילת יוקרה',
    description: 'חבילת קידום מתקדמת עם מיקום בראש העמוד',
    type: 'premium',
    price: 200,
    duration_days: 30,
    features: ['מיקום בראש העמוד', 'הדגשה צבעונית', 'תג "מומלץ"', 'עדיפות בחיפוש'],
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    stats: {
      total_purchases: 45,
      active_campaigns: 12,
      revenue: 9000,
      avg_performance: 85
    }
  },
  {
    id: '2',
    title: 'קידום מומלץ - חבילה בסיסית',
    description: 'חבילת קידום בסיסית עם הדגשה ומיקום משופר',
    type: 'featured',
    price: 50,
    duration_days: 14,
    features: ['הדגשה בצבע', 'תג "מומלץ"', 'מיקום משופר'],
    is_active: true,
    created_at: '2024-01-20T14:30:00Z',
    stats: {
      total_purchases: 128,
      active_campaigns: 34,
      revenue: 6400,
      avg_performance: 72
    }
  },
  {
    id: '3',
    title: 'קידום עליון - חבילת TOP',
    description: 'חבילת קידום מתקדמת למיקום בחלק העליון',
    type: 'top',
    price: 100,
    duration_days: 21,
    features: ['מיקום עליון', 'הדגשה מיוחדת', 'תג "TOP"'],
    is_active: false,
    created_at: '2024-02-01T09:15:00Z',
    stats: {
      total_purchases: 67,
      active_campaigns: 0,
      revenue: 6700,
      avg_performance: 0
    }
  }
];

const mockCampaigns = [
  {
    id: '1',
    ad_id: '1',
    ad_title: 'טויוטה קמרי 2020 - מצב מעולה',
    promotion_type: 'premium',
    start_date: '2024-02-01T00:00:00Z',
    end_date: '2024-03-01T00:00:00Z',
    price: 200,
    status: 'active',
    payment_status: 'paid',
    user: {
      full_name: 'יוסי כהן',
      email: 'yossi@example.com'
    },
    performance: {
      views: 1250,
      clicks: 89,
      leads: 12,
      ctr: 7.1,
      conversion_rate: 13.5
    }
  },
  {
    id: '2',
    ad_id: '2',
    ad_title: 'הונדה סיוויק 2019 - חסכונית ואמינה',
    promotion_type: 'featured',
    start_date: '2024-02-05T00:00:00Z',
    end_date: '2024-02-19T00:00:00Z',
    price: 50,
    status: 'completed',
    payment_status: 'paid',
    user: {
      full_name: 'שרה לוי',
      email: 'sarah@example.com'
    },
    performance: {
      views: 890,
      clicks: 45,
      leads: 8,
      ctr: 5.1,
      conversion_rate: 17.8
    }
  },
  {
    id: '3',
    ad_id: '3',
    ad_title: 'מרצדס C200 2018 - יוקרה ונוחות',
    promotion_type: 'top',
    start_date: '2024-02-10T00:00:00Z',
    end_date: '2024-03-02T00:00:00Z',
    price: 100,
    status: 'paused',
    payment_status: 'paid',
    user: {
      full_name: 'דוד מזרחי',
      email: 'david@example.com'
    },
    performance: {
      views: 456,
      clicks: 23,
      leads: 3,
      ctr: 5.0,
      conversion_rate: 13.0
    }
  }
];

const PromotionCard = ({ promotion, onEdit, onToggle, onDelete, onViewCampaigns }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'premium': return <Crown className="h-5 w-5 text-purple-600" />;
      case 'featured': return <Star className="h-5 w-5 text-yellow-600" />;
      case 'top': return <Award className="h-5 w-5 text-blue-600" />;
      default: return <Megaphone className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'featured': return 'bg-yellow-100 text-yellow-800';
      case 'top': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'premium': return 'פרימיום';
      case 'featured': return 'מומלץ';
      case 'top': return 'עליון';
      default: return 'בסיסי';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getTypeIcon(promotion.type)}
            <div>
              <CardTitle className="text-lg">{promotion.title}</CardTitle>
              <CardDescription className="mt-1">{promotion.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getTypeColor(promotion.type)}>
              {getTypeText(promotion.type)}
            </Badge>
            <Badge variant={promotion.is_active ? 'default' : 'secondary'}>
              {promotion.is_active ? 'פעיל' : 'לא פעיל'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Pricing and Duration */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-600">₪{promotion.price}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">{promotion.duration_days} ימים</span>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">תכונות החבילה:</h4>
            <div className="grid grid-cols-2 gap-2">
              {promotion.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{promotion.stats.total_purchases}</p>
              <p className="text-xs text-gray-500">סך רכישות</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">₪{promotion.stats.revenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">הכנסות</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewCampaigns(promotion)}
              className="flex-1"
            >
              <BarChart3 className="h-4 w-4 ml-2" />
              קמפיינים ({promotion.stats.active_campaigns})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(promotion)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggle(promotion)}
            >
              {promotion.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(promotion)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CampaignCard = ({ campaign, onPause, onResume, onStop }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'paused': return 'מושהה';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return 'לא ידוע';
    }
  };

  const getPromotionIcon = (type) => {
    switch (type) {
      case 'premium': return <Crown className="h-4 w-4 text-purple-600" />;
      case 'featured': return <Star className="h-4 w-4 text-yellow-600" />;
      case 'top': return <Award className="h-4 w-4 text-blue-600" />;
      default: return <Megaphone className="h-4 w-4 text-gray-600" />;
    }
  };

  const daysRemaining = Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((new Date(campaign.end_date) - new Date(campaign.start_date)) / (1000 * 60 * 60 * 24));
  const progress = Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getPromotionIcon(campaign.promotion_type)}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{campaign.ad_title}</h3>
                <p className="text-sm text-gray-600">{campaign.user.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(campaign.status)}>
                {getStatusText(campaign.status)}
              </Badge>
              <Badge variant="outline" className="text-green-600">
                ₪{campaign.price}
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>התקדמות קמפיין</span>
              <span>{daysRemaining} ימים נותרו</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Eye className="h-3 w-3 text-blue-600" />
                <span className="text-lg font-bold text-blue-600">
                  {campaign.performance.views.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500">צפיות</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <MousePointer className="h-3 w-3 text-green-600" />
                <span className="text-lg font-bold text-green-600">
                  {campaign.performance.clicks}
                </span>
              </div>
              <p className="text-xs text-gray-500">קליקים</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-purple-600" />
                <span className="text-lg font-bold text-purple-600">
                  {campaign.performance.leads}
                </span>
              </div>
              <p className="text-xs text-gray-500">פניות</p>
            </div>
            <div>
              <span className="text-lg font-bold text-orange-600">
                {campaign.performance.ctr}%
              </span>
              <p className="text-xs text-gray-500">CTR</p>
            </div>
            <div>
              <span className="text-lg font-bold text-red-600">
                {campaign.performance.conversion_rate}%
              </span>
              <p className="text-xs text-gray-500">המרה</p>
            </div>
          </div>

          {/* Actions */}
          {campaign.status === 'active' && (
            <div className="flex items-center gap-2 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPause(campaign)}
                className="flex-1"
              >
                <Pause className="h-4 w-4 ml-2" />
                השהה
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStop(campaign)}
                className="text-red-600 hover:text-red-700"
              >
                <Square className="h-4 w-4 ml-2" />
                עצור
              </Button>
            </div>
          )}

          {campaign.status === 'paused' && (
            <div className="flex items-center gap-2 pt-3 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onResume(campaign)}
                className="flex-1"
              >
                <Play className="h-4 w-4 ml-2" />
                המשך
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStop(campaign)}
                className="text-red-600 hover:text-red-700"
              >
                <Square className="h-4 w-4 ml-2" />
                עצור
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CreatePromotionDialog = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'featured',
    price: '',
    duration_days: '',
    features: []
  });

  const handleSave = () => {
    onSave(formData);
    setFormData({
      title: '',
      description: '',
      type: 'featured',
      price: '',
      duration_days: '',
      features: []
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>יצירת חבילת קידום חדשה</DialogTitle>
          <DialogDescription>
            צור חבילת קידום חדשה עם תכונות ומחירים מותאמים
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              כותרת
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="col-span-3"
              placeholder="שם החבילה..."
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              תיאור
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="col-span-3"
              placeholder="תיאור החבילה..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              סוג
            </Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">מומלץ</SelectItem>
                <SelectItem value="top">עליון</SelectItem>
                <SelectItem value="premium">פרימיום</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              מחיר (₪)
            </Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="col-span-3"
              placeholder="0"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">
              משך (ימים)
            </Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_days}
              onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
              className="col-span-3"
              placeholder="14"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={handleSave}>
            צור חבילה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function PromotionManagementPage() {
  const [promotions, setPromotions] = useState(mockPromotions);
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreatePromotion = (promotionData) => {
    const newPromotion = {
      id: Date.now().toString(),
      ...promotionData,
      price: parseInt(promotionData.price),
      duration_days: parseInt(promotionData.duration_days),
      is_active: true,
      created_at: new Date().toISOString(),
      stats: {
        total_purchases: 0,
        active_campaigns: 0,
        revenue: 0,
        avg_performance: 0
      }
    };
    setPromotions([...promotions, newPromotion]);
  };

  const handleEditPromotion = (promotion) => {
  };

  const handleTogglePromotion = (promotion) => {
    setPromotions(promotions.map(p => 
      p.id === promotion.id ? { ...p, is_active: !p.is_active } : p
    ));
  };

  const handleDeletePromotion = (promotion) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את חבילת הקידום "${promotion.title}"?`)) {
      setPromotions(promotions.filter(p => p.id !== promotion.id));
    }
  };

  const handleViewCampaigns = (promotion) => {
  };

  const handlePauseCampaign = (campaign) => {
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, status: 'paused' } : c
    ));
  };

  const handleResumeCampaign = (campaign) => {
    setCampaigns(campaigns.map(c => 
      c.id === campaign.id ? { ...c, status: 'active' } : c
    ));
  };

  const handleStopCampaign = (campaign) => {
    if (confirm(`האם אתה בטוח שברצונך לעצור את הקמפיין "${campaign.ad_title}"?`)) {
      setCampaigns(campaigns.map(c => 
        c.id === campaign.id ? { ...c, status: 'cancelled' } : c
      ));
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleExport = () => {
  };

  const stats = {
    total_promotions: promotions.length,
    active_promotions: promotions.filter(p => p.is_active).length,
    total_campaigns: campaigns.length,
    active_campaigns: campaigns.filter(c => c.status === 'active').length,
    total_revenue: promotions.reduce((sum, p) => sum + p.stats.revenue, 0),
    avg_performance: promotions.reduce((sum, p) => sum + p.stats.avg_performance, 0) / promotions.length || 0
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">קידום ומבצעים</h1>
          <p className="text-gray-600 mt-1">ניהול חבילות קידום, קמפיינים וניתוח ביצועים</p>
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
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            חבילה חדשה
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">חבילות</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_promotions}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">פעילות</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active_promotions}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-600">קמפיינים</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.total_campaigns}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">פעילים</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.active_campaigns}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">הכנסות</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">₪{stats.total_revenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">ביצועים</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avg_performance.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="packages" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="packages">חבילות קידום ({promotions.length})</TabsTrigger>
          <TabsTrigger value="campaigns">קמפיינים פעילים ({campaigns.filter(c => c.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="analytics">ניתוח ביצועים</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                onEdit={handleEditPromotion}
                onToggle={handleTogglePromotion}
                onDelete={handleDeletePromotion}
                onViewCampaigns={handleViewCampaigns}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="חיפוש קמפיינים..."
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
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="paused">מושהה</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="cancelled">בוטל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPause={handlePauseCampaign}
                onResume={handleResumeCampaign}
                onStop={handleStopCampaign}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  ביצועי חבילות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {promotions.map((promotion) => (
                    <div key={promotion.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{promotion.title}</span>
                        <span className="font-medium">{promotion.stats.avg_performance}%</span>
                      </div>
                      <Progress value={promotion.stats.avg_performance} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  התפלגות הכנסות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {promotions.map((promotion) => (
                    <div key={promotion.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          promotion.type === 'premium' ? 'bg-purple-500' :
                          promotion.type === 'featured' ? 'bg-yellow-500' : 'bg-gradient-to-r from-blue-50 to-amber-500'
                        }`} />
                        <span className="text-sm">{promotion.title}</span>
                      </div>
                      <span className="font-medium">₪{promotion.stats.revenue.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Promotion Dialog */}
      <CreatePromotionDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSave={handleCreatePromotion}
      />
    </div>
  );
}