import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Globe,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Settings,
  Database,
  Mail,
  Phone,
  Car,
  DollarSign,
  TrendingUp,
  Activity,
  Zap,
  Server,
  Bug,
  Info,
  AlertCircle
} from 'lucide-react';

// Mock audit log data
const mockAuditLogs = [
  {
    id: '1',
    timestamp: '2024-02-10T14:30:00Z',
    user_id: '1',
    user_name: 'יוסי כהן',
    user_email: 'yossi@example.com',
    action: 'user_login',
    resource_type: 'user',
    resource_id: '1',
    description: 'התחברות למערכת',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    location: 'תל אביב, ישראל',
    device_type: 'desktop',
    status: 'success',
    severity: 'info',
    details: {
      login_method: 'email',
      session_duration: '2h 15m',
      previous_login: '2024-02-09T10:15:00Z'
    }
  },
  {
    id: '2',
    timestamp: '2024-02-10T14:25:00Z',
    user_id: 'admin',
    user_name: 'מנהל מערכת',
    user_email: 'admin@zomet.co.il',
    action: 'ad_approved',
    resource_type: 'vehicle_ad',
    resource_id: '123',
    description: 'אישור מודעה - טויוטה קמרי 2020',
    ip_address: '10.0.0.5',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'חיפה, ישראל',
    device_type: 'desktop',
    status: 'success',
    severity: 'info',
    details: {
      ad_title: 'טויוטה קמרי 2020 - מצב מעולה',
      ad_owner: 'יוסי כהן',
      approval_reason: 'מודעה עומדת בכל הדרישות'
    }
  },
  {
    id: '3',
    timestamp: '2024-02-10T14:20:00Z',
    user_id: '2',
    user_name: 'שרה לוי',
    user_email: 'sarah@example.com',
    action: 'payment_completed',
    resource_type: 'promotion',
    resource_id: '456',
    description: 'תשלום עבור קידום מודעה',
    ip_address: '203.0.113.45',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
    location: 'ירושלים, ישראל',
    device_type: 'mobile',
    status: 'success',
    severity: 'info',
    details: {
      amount: 50,
      currency: 'ILS',
      payment_method: 'credit_card',
      promotion_type: 'featured'
    }
  },
  {
    id: '4',
    timestamp: '2024-02-10T14:15:00Z',
    user_id: '3',
    user_name: 'דוד מזרחי',
    user_email: 'david@example.com',
    action: 'login_failed',
    resource_type: 'user',
    resource_id: '3',
    description: 'ניסיון התחברות כושל - סיסמה שגויה',
    ip_address: '198.51.100.25',
    user_agent: 'Mozilla/5.0 (Android 11; Mobile; rv:68.0)',
    location: 'באר שבע, ישראל',
    device_type: 'mobile',
    status: 'failed',
    severity: 'warning',
    details: {
      failure_reason: 'invalid_password',
      attempt_number: 3,
      remaining_attempts: 2
    }
  },
  {
    id: '5',
    timestamp: '2024-02-10T14:10:00Z',
    user_id: 'system',
    user_name: 'מערכת',
    user_email: 'system@zomet.co.il',
    action: 'system_backup',
    resource_type: 'system',
    resource_id: 'backup_001',
    description: 'גיבוי אוטומטי של המערכת',
    ip_address: '127.0.0.1',
    user_agent: 'System/1.0',
    location: 'שרת ראשי',
    device_type: 'server',
    status: 'success',
    severity: 'info',
    details: {
      backup_size: '2.5GB',
      backup_duration: '15m 32s',
      backup_type: 'full'
    }
  },
  {
    id: '6',
    timestamp: '2024-02-10T14:05:00Z',
    user_id: 'unknown',
    user_name: 'לא ידוע',
    user_email: 'unknown',
    action: 'suspicious_activity',
    resource_type: 'security',
    resource_id: 'alert_001',
    description: 'פעילות חשודה - ניסיונות התחברות מרובים',
    ip_address: '185.220.101.45',
    user_agent: 'curl/7.68.0',
    location: 'לא ידוע',
    device_type: 'unknown',
    status: 'blocked',
    severity: 'critical',
    details: {
      attempts_count: 50,
      time_window: '5 minutes',
      blocked_duration: '1 hour'
    }
  }
];

const LogCard = ({ log, onViewDetails }) => {
  const getActionIcon = (action) => {
    switch (action) {
      case 'user_login': return <User className="h-4 w-4 text-green-600" />;
      case 'login_failed': return <Lock className="h-4 w-4 text-red-600" />;
      case 'user_logout': return <Unlock className="h-4 w-4 text-gray-600" />;
      case 'user_created': return <UserPlus className="h-4 w-4 text-blue-600" />;
      case 'user_deleted': return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'ad_created': return <Car className="h-4 w-4 text-blue-600" />;
      case 'ad_approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'ad_rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'payment_completed': return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'system_backup': return <Database className="h-4 w-4 text-blue-600" />;
      case 'settings_changed': return <Settings className="h-4 w-4 text-orange-600" />;
      case 'suspicious_activity': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="h-3 w-3" />;
      case 'desktop': return <Monitor className="h-3 w-3" />;
      case 'server': return <Server className="h-3 w-3" />;
      default: return <Globe className="h-3 w-3" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon and Severity */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {getActionIcon(log.action)}
            <Badge className={`text-xs ${getSeverityColor(log.severity)}`}>
              {log.severity === 'critical' ? 'קריטי' : 
               log.severity === 'warning' ? 'אזהרה' : 'מידע'}
            </Badge>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">
                  {log.description}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(log.status)}>
                    {log.status === 'success' ? 'הצליח' :
                     log.status === 'failed' ? 'נכשל' :
                     log.status === 'blocked' ? 'חסום' : 'ממתין'}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(log)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">
                  {log.user_name ? log.user_name.charAt(0) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700">{log.user_name}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{log.user_email}</span>
            </div>

            {/* Technical Details */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{log.ip_address}</span>
              </div>
              <div className="flex items-center gap-1">
                {getDeviceIcon(log.device_type)}
                <span>{log.location}</span>
              </div>
              {log.resource_type && (
                <div className="flex items-center gap-1">
                  <span>משאב: {log.resource_type}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LogDetailsDialog = ({ log, isOpen, onClose }) => {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>פרטי יומן ביקורת</DialogTitle>
          <DialogDescription>
            מידע מפורט על הפעולה שבוצעה במערכת
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">זמן</Label>
              <p className="text-sm text-gray-600">
                {new Date(log.timestamp).toLocaleString('he-IL')}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">פעולה</Label>
              <p className="text-sm text-gray-600">{log.description}</p>
            </div>
          </div>

          <Separator />

          {/* User Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">פרטי משתמש</Label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">שם:</span>
                <span className="mr-2">{log.user_name}</span>
              </div>
              <div>
                <span className="text-gray-500">אימייל:</span>
                <span className="mr-2">{log.user_email}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Technical Info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">פרטים טכניים</Label>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">כתובת IP:</span>
                <span className="mr-2 font-mono">{log.ip_address}</span>
              </div>
              <div>
                <span className="text-gray-500">מיקום:</span>
                <span className="mr-2">{log.location}</span>
              </div>
              <div>
                <span className="text-gray-500">סוג מכשיר:</span>
                <span className="mr-2">{log.device_type}</span>
              </div>
              <div>
                <span className="text-gray-500">סטטוס:</span>
                <Badge className={`mr-2 ${
                  log.status === 'success' ? 'bg-green-100 text-green-800' :
                  log.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {log.status === 'success' ? 'הצליח' :
                   log.status === 'failed' ? 'נכשל' : log.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* User Agent */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">דפדפן</Label>
            <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
              {log.user_agent}
            </p>
          </div>

          {/* Additional Details */}
          {log.details && Object.keys(log.details).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">פרטים נוספים</Label>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {Object.entries(log.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium">{JSON.stringify(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(mockAuditLogs);
  const [filteredLogs, setFilteredLogs] = useState(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateRange, setDateRange] = useState('today');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address.includes(searchTerm)
      );
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === selectedSeverity);
    }

    // Action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.user_id === selectedUser);
    }

    // Date range filter
    const now = new Date();
    if (dateRange !== 'all') {
      const startDate = new Date();
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedSeverity, selectedAction, selectedUser, dateRange]);

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setIsDetailsDialogOpen(true);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleExport = () => {
    const csvContent = [
      ['זמן', 'משתמש', 'פעולה', 'סטטוס', 'רמת חומרה', 'כתובת IP', 'מיקום'],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString('he-IL'),
        log.user_name,
        log.description,
        log.status,
        log.severity,
        log.ip_address,
        log.location
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const stats = {
    total: logs.length,
    critical: logs.filter(l => l.severity === 'critical').length,
    warnings: logs.filter(l => l.severity === 'warning').length,
    failed_logins: logs.filter(l => l.action === 'login_failed').length,
    successful_actions: logs.filter(l => l.status === 'success').length
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueUsers = [...new Set(logs.map(log => ({ id: log.user_id, name: log.user_name })))];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">יומני ביקורת</h1>
          <p className="text-gray-600 mt-1">מעקב פעולות מערכת ויומני אבטחה</p>
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
            ייצא CSV
          </Button>
        </div>
      </div>

      {/* Security Alerts */}
      {stats.critical > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">התראת אבטחה</AlertTitle>
          <AlertDescription className="text-red-700">
            זוהו {stats.critical} אירועי אבטחה קריטיים. אנא בדוק את היומנים מיד.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">סך הרשומות</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-gray-600">קריטי</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-gray-600">אזהרות</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.warnings}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-gray-600">התחברות כושלת</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.failed_logins}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">פעולות מוצלחות</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.successful_actions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="חיפוש ביומנים..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            
            <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="רמת חומרה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הרמות</SelectItem>
                <SelectItem value="critical">קריטי</SelectItem>
                <SelectItem value="warning">אזהרה</SelectItem>
                <SelectItem value="info">מידע</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="סוג פעולה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפעולות</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="משתמש" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המשתמשים</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="תקופה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הזמנים</SelectItem>
                <SelectItem value="today">היום</SelectItem>
                <SelectItem value="week">השבוע האחרון</SelectItem>
                <SelectItem value="month">החודש האחרון</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-4">
        {filteredLogs.map((log) => (
          <LogCard
            key={log.id}
            log={log}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              לא נמצאו יומנים
            </h3>
            <p className="text-gray-600">
              נסה לשנות את הפילטרים או החיפוש
            </p>
          </CardContent>
        </Card>
      )}

      {/* Log Details Dialog */}
      <LogDetailsDialog
        log={selectedLog}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
      />
    </div>
  );
}