import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Server,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Settings,
  Power,
  Activity,
  Clock,
  Zap,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Bell,
  Mail,
  Phone,
  FileText,
  Archive,
  RotateCcw,
  Play,
  Pause,
  Square,
  AlertCircle,
  Info,
  Warning,
  Ban,
  CheckSquare,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function SystemManagement() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    overall: 'healthy',
    database: 'healthy',
    server: 'healthy',
    storage: 'healthy',
    network: 'healthy'
  });
  
  // System metrics
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: { usage: 0, cores: 4, temperature: 0 },
    memory: { used: 0, total: 16, percentage: 0 },
    disk: { used: 0, total: 500, percentage: 0 },
    network: { inbound: 0, outbound: 0, connections: 0 },
    database: { size: 0, connections: 0, queries: 0, slowQueries: 0 },
    uptime: 0,
    lastRestart: null
  });
  
  // System logs
  const [systemLogs, setSystemLogs] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  
  // Backup status
  const [backupStatus, setBackupStatus] = useState({
    lastBackup: null,
    nextBackup: null,
    backupSize: 0,
    status: 'idle',
    autoBackup: true
  });
  
  // Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  
  // Alerts and notifications
  const [systemAlerts, setSystemAlerts] = useState([]);
  
  // Dialog states
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);

  // Load system data
  useEffect(() => {
    loadSystemData();
    
    // Set up real-time monitoring
    const interval = setInterval(loadSystemData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      
      // Load system metrics (mock data - in real app would come from monitoring APIs)
      const metrics = {
        cpu: {
          usage: Math.floor(Math.random() * 40) + 20,
          cores: 4,
          temperature: Math.floor(Math.random() * 20) + 45
        },
        memory: {
          used: Math.floor(Math.random() * 8) + 4,
          total: 16,
          percentage: 0
        },
        disk: {
          used: Math.floor(Math.random() * 200) + 100,
          total: 500,
          percentage: 0
        },
        network: {
          inbound: Math.floor(Math.random() * 100) + 50,
          outbound: Math.floor(Math.random() * 80) + 30,
          connections: Math.floor(Math.random() * 50) + 25
        },
        database: {
          size: Math.floor(Math.random() * 500) + 200,
          connections: Math.floor(Math.random() * 20) + 10,
          queries: Math.floor(Math.random() * 1000) + 500,
          slowQueries: Math.floor(Math.random() * 10)
        },
        uptime: Math.floor(Math.random() * 30) + 1, // Days
        lastRestart: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      };
      
      // Calculate percentages
      metrics.memory.percentage = Math.round((metrics.memory.used / metrics.memory.total) * 100);
      metrics.disk.percentage = Math.round((metrics.disk.used / metrics.disk.total) * 100);
      
      setSystemMetrics(metrics);
      
      // Load system status
      const status = {
        overall: calculateOverallStatus(metrics),
        database: metrics.database.slowQueries > 5 ? 'warning' : 'healthy',
        server: metrics.cpu.usage > 80 ? 'warning' : 'healthy',
        storage: metrics.disk.percentage > 85 ? 'warning' : 'healthy',
        network: metrics.network.connections > 80 ? 'warning' : 'healthy'
      };
      
      setSystemStatus(status);
      
      // Load logs
      await loadSystemLogs();
      
      // Load backup status
      setBackupStatus({
        lastBackup: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        nextBackup: new Date(Date.now() + 24 * 60 * 60 * 1000),
        backupSize: Math.floor(Math.random() * 500) + 100,
        status: 'idle',
        autoBackup: true
      });
      
      // Generate system alerts
      generateSystemAlerts(metrics, status);
      
    } catch (error) {
      console.error('Error loading system data:', error);
      toast({
        title: "שגיאה בטעינת נתוני מערכת",
        description: "לא ניתן לטעון את נתוני המערכת",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemLogs = async () => {
    try {
      // Load activity logs
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Separate logs by type
      const systemLogs = activities?.filter(log => 
        ['system_start', 'system_stop', 'backup_created', 'maintenance_mode'].includes(log.action)
      ) || [];
      
      const securityLogs = activities?.filter(log => 
        ['signin_failed', 'password_reset_request', 'account_locked'].includes(log.action)
      ) || [];
      
      const errorLogs = activities?.filter(log => 
        log.action.includes('error') || log.action.includes('failed')
      ) || [];
      
      setSystemLogs(systemLogs);
      setSecurityLogs(securityLogs);
      setErrorLogs(errorLogs);
      
    } catch (error) {
      console.error('Error loading system logs:', error);
    }
  };

  const calculateOverallStatus = (metrics) => {
    if (metrics.cpu.usage > 90 || metrics.memory.percentage > 90 || metrics.disk.percentage > 95) {
      return 'critical';
    }
    if (metrics.cpu.usage > 70 || metrics.memory.percentage > 80 || metrics.disk.percentage > 85) {
      return 'warning';
    }
    return 'healthy';
  };

  const generateSystemAlerts = (metrics, status) => {
    const alerts = [];
    
    if (metrics.cpu.usage > 80) {
      alerts.push({
        id: 'cpu-high',
        type: 'warning',
        title: 'שימוש גבוה ב-CPU',
        message: `שימוש ב-CPU: ${metrics.cpu.usage}%`,
        timestamp: new Date(),
        action: 'בדוק תהליכים פעילים'
      });
    }
    
    if (metrics.memory.percentage > 85) {
      alerts.push({
        id: 'memory-high',
        type: 'warning',
        title: 'שימוש גבוה בזיכרון',
        message: `שימוש בזיכרון: ${metrics.memory.percentage}%`,
        timestamp: new Date(),
        action: 'נקה זיכרון או הוסף RAM'
      });
    }
    
    if (metrics.disk.percentage > 90) {
      alerts.push({
        id: 'disk-full',
        type: 'critical',
        title: 'מקום דיסק נמוך',
        message: `שימוש בדיסק: ${metrics.disk.percentage}%`,
        timestamp: new Date(),
        action: 'נקה קבצים או הוסף שטח'
      });
    }
    
    if (metrics.database.slowQueries > 10) {
      alerts.push({
        id: 'slow-queries',
        type: 'warning',
        title: 'שאילתות איטיות',
        message: `${metrics.database.slowQueries} שאילתות איטיות`,
        timestamp: new Date(),
        action: 'בדוק אופטימיזציה של DB'
      });
    }
    
    setSystemAlerts(alerts);
  };

  const handleCreateBackup = async () => {
    try {
      setBackupStatus(prev => ({ ...prev, status: 'running' }));
      
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setBackupStatus(prev => ({
        ...prev,
        status: 'completed',
        lastBackup: new Date(),
        backupSize: Math.floor(Math.random() * 500) + 100
      }));
      
      toast({
        title: "גיבוי הושלם בהצלחה",
        description: "גיבוי המערכת נוצר בהצלחה",
      });
      
      setShowBackupDialog(false);
    } catch (error) {
      setBackupStatus(prev => ({ ...prev, status: 'failed' }));
      toast({
        title: "שגיאה ביצירת גיבוי",
        description: "לא ניתן ליצור גיבוי של המערכת",
        variant: "destructive"
      });
    }
  };

  const handleRestartSystem = async () => {
    try {
      toast({
        title: "מערכת מתחילה מחדש",
        description: "המערכת תהיה זמינה תוך מספר דקות",
      });
      
      setShowRestartDialog(false);
      
      // In real app, this would trigger a system restart
      // For demo, we'll just update the last restart time
      setTimeout(() => {
        setSystemMetrics(prev => ({
          ...prev,
          lastRestart: new Date(),
          uptime: 0
        }));
        
        toast({
          title: "המערכת חזרה לפעילות",
          description: "המערכת הופעלה מחדש בהצלחה",
        });
      }, 5000);
      
    } catch (error) {
      toast({
        title: "שגיאה בהפעלה מחדש",
        description: "לא ניתן להפעיל את המערכת מחדש",
        variant: "destructive"
      });
    }
  };

  const handleToggleMaintenanceMode = async () => {
    try {
      const newMode = !maintenanceMode;
      setMaintenanceMode(newMode);
      
      // Log maintenance mode change
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: user.id,
          action: newMode ? 'maintenance_mode_enabled' : 'maintenance_mode_disabled',
          resource_type: 'system',
          details: { maintenance_mode: newMode }
        }]);
      
      toast({
        title: newMode ? "מצב תחזוקה הופעל" : "מצב תחזוקה בוטל",
        description: newMode ? "האתר במצב תחזוקה" : "האתר חזר לפעילות רגילה",
      });
      
      setShowMaintenanceDialog(false);
    } catch (error) {
      toast({
        title: "שגיאה בשינוי מצב תחזוקה",
        description: "לא ניתן לשנות את מצב התחזוקה",
        variant: "destructive"
      });
    }
  };

  const dismissAlert = (alertId) => {
    setSystemAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (days) => {
    if (days < 1) return 'פחות מיום';
    if (days === 1) return 'יום אחד';
    return `${days} ימים`;
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">אין הרשאות מנהל</h2>
          <p className="text-gray-600">אין לך הרשאות לנהל את המערכת.</p>
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
            <Server className="h-7 w-7 text-red-600" />
            ניהול מערכת
          </h1>
          <p className="text-gray-600">ניטור, תחזוקה ואבטחת המערכת</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSystemData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          <Button 
            variant={maintenanceMode ? "destructive" : "outline"} 
            size="sm"
            onClick={() => setShowMaintenanceDialog(true)}
          >
            <Settings className="h-4 w-4" />
            {maintenanceMode ? 'בטל תחזוקה' : 'מצב תחזוקה'}
          </Button>
        </div>
      </div>

      {/* System Alerts */}
      {systemAlerts.length > 0 && (
        <div className="space-y-2">
          {systemAlerts.map((alert) => (
            <Alert key={alert.id} className={`${
              alert.type === 'critical' ? 'border-red-500 bg-red-50' :
              alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-gradient-to-r from-blue-50 to-amber-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {alert.type === 'critical' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500" />
                  )}
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <AlertDescription>{alert.message}</AlertDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    {alert.action}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">סטטוס כללי</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.overall)}
                  <span className={`text-sm font-bold ${getStatusColor(systemStatus.overall)}`}>
                    {systemStatus.overall === 'healthy' ? 'תקין' :
                     systemStatus.overall === 'warning' ? 'אזהרה' : 'קריטי'}
                  </span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">שרת</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.server)}
                  <span className={`text-sm font-bold ${getStatusColor(systemStatus.server)}`}>
                    {systemStatus.server === 'healthy' ? 'תקין' : 'אזהרה'}
                  </span>
                </div>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">מסד נתונים</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.database)}
                  <span className={`text-sm font-bold ${getStatusColor(systemStatus.database)}`}>
                    {systemStatus.database === 'healthy' ? 'תקין' : 'אזהרה'}
                  </span>
                </div>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-800">אחסון</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.storage)}
                  <span className={`text-sm font-bold ${getStatusColor(systemStatus.storage)}`}>
                    {systemStatus.storage === 'healthy' ? 'תקין' : 'אזהרה'}
                  </span>
                </div>
              </div>
              <HardDrive className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-800">רשת</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(systemStatus.network)}
                  <span className={`text-sm font-bold ${getStatusColor(systemStatus.network)}`}>
                    {systemStatus.network === 'healthy' ? 'תקין' : 'אזהרה'}
                  </span>
                </div>
              </div>
              <Wifi className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>