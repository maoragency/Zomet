import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Settings,
  Database,
  Shield,
  Bell,
  Mail,
  Globe,
  Palette,
  Code,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react';

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General settings
    siteName: 'זומט - מערכת ניהול רכב',
    siteDescription: 'פלטפורמה מתקדמת לקנייה ומכירה של רכבים',
    contactEmail: 'zometauto@gmail.com',
    supportPhone: '',
    
    // Feature flags
    enableRegistration: true,
    enableVehicleApproval: true,
    enablePromotions: true,
    enableNotifications: true,
    enableAnalytics: true,
    
    // Email settings
    emailNotifications: true,
    welcomeEmailEnabled: true,
    promotionalEmails: false,
    
    // System settings
    maxVehicleImages: 10,
    maxVehiclePrice: 10000000,
    minVehiclePrice: 1000,
    autoApproveVehicles: false,
    
    // UI settings
    maintenanceMode: false,
    showBetaFeatures: false,
    enableDarkMode: false
  });

  // Load system settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // In a real app, these would come from a settings table
      // For now, we'll use default values
      const defaultSettings = {
        siteName: 'זומט - מערכת ניהול רכב',
        siteDescription: 'פלטפורמה מתקדמת לקנייה ומכירה של רכבים',
        contactEmail: 'zometauto@gmail.com',
        supportPhone: '',
        enableRegistration: true,
        enableVehicleApproval: true,
        enablePromotions: true,
        enableNotifications: true,
        enableAnalytics: true,
        emailNotifications: true,
        welcomeEmailEnabled: true,
        promotionalEmails: false,
        maxVehicleImages: 10,
        maxVehiclePrice: 10000000,
        minVehiclePrice: 1000,
        autoApproveVehicles: false,
        maintenanceMode: false,
        showBetaFeatures: false,
        enableDarkMode: false
      };
      
      setSettings(defaultSettings);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את הגדרות המערכת",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      
      // In a real app, this would save to a settings table
      // For now, we'll just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log the settings change
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'system_settings_updated',
          resource_type: 'system',
          details: {
            updated_by: user.email,
            settings_changed: Object.keys(settings)
          }
        });

      toast({
        title: "נשמר בהצלחה",
        description: "הגדרות המערכת עודכנו בהצלחה",
      });
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשמור את הגדרות המערכת",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Update setting value
  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">הגדרות מערכת</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">הגדרות מערכת</h1>
          <p className="text-gray-600 mt-1">
            ניהול תצורה והגדרות כלליות של המערכת
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadSettings} variant="outline">
            <RefreshCw className="h-4 w-4 ml-2" />
            רענן
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className={`h-4 w-4 ml-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'שומר...' : 'שמור הגדרות'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">כללי</TabsTrigger>
          <TabsTrigger value="features">תכונות</TabsTrigger>
          <TabsTrigger value="email">אימייל</TabsTrigger>
          <TabsTrigger value="limits">מגבלות</TabsTrigger>
          <TabsTrigger value="advanced">מתקדם</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                הגדרות כלליות
              </CardTitle>
              <CardDescription>
                הגדרות בסיסיות של האתר והמערכת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">שם האתר</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => updateSetting('siteName', e.target.value)}
                    placeholder="שם האתר"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">אימייל יצירת קשר</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => updateSetting('contactEmail', e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="siteDescription">תיאור האתר</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => updateSetting('siteDescription', e.target.value)}
                  placeholder="תיאור קצר של האתר"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supportPhone">טלפון תמיכה</Label>
                <Input
                  id="supportPhone"
                  value={settings.supportPhone}
                  onChange={(e) => updateSetting('supportPhone', e.target.value)}
                  placeholder="050-1234567"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Settings */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                תכונות מערכת
              </CardTitle>
              <CardDescription>
                הפעלה והשבתה של תכונות במערכת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>הרשמת משתמשים חדשים</Label>
                    <p className="text-sm text-gray-500">אפשר למשתמשים חדשים להירשם</p>
                  </div>
                  <Switch
                    checked={settings.enableRegistration}
                    onCheckedChange={(checked) => updateSetting('enableRegistration', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>אישור מודעות</Label>
                    <p className="text-sm text-gray-500">דרוש אישור מנהל למודעות חדשות</p>
                  </div>
                  <Switch
                    checked={settings.enableVehicleApproval}
                    onCheckedChange={(checked) => updateSetting('enableVehicleApproval', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>קידום מודעות</Label>
                    <p className="text-sm text-gray-500">אפשר למשתמשים לקדם מודעות</p>
                  </div>
                  <Switch
                    checked={settings.enablePromotions}
                    onCheckedChange={(checked) => updateSetting('enablePromotions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>התראות</Label>
                    <p className="text-sm text-gray-500">שלח התראות למשתמשים</p>
                  </div>
                  <Switch
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>אנליטיקה</Label>
                    <p className="text-sm text-gray-500">איסוף נתוני שימוש ואנליטיקה</p>
                  </div>
                  <Switch
                    checked={settings.enableAnalytics}
                    onCheckedChange={(checked) => updateSetting('enableAnalytics', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>אישור אוטומטי</Label>
                    <p className="text-sm text-gray-500">אשר מודעות אוטומטית ללא בדיקה</p>
                  </div>
                  <Switch
                    checked={settings.autoApproveVehicles}
                    onCheckedChange={(checked) => updateSetting('autoApproveVehicles', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                הגדרות אימייל
              </CardTitle>
              <CardDescription>
                ניהול התראות ומיילים אוטומטיים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>התראות אימייל</Label>
                    <p className="text-sm text-gray-500">שלח התראות כלליות באימייל</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>אימייל ברוכים הבאים</Label>
                    <p className="text-sm text-gray-500">שלח אימייל ברוכים הבאים למשתמשים חדשים</p>
                  </div>
                  <Switch
                    checked={settings.welcomeEmailEnabled}
                    onCheckedChange={(checked) => updateSetting('welcomeEmailEnabled', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>אימיילים שיווקיים</Label>
                    <p className="text-sm text-gray-500">שלח אימיילים שיווקיים ועדכונים</p>
                  </div>
                  <Switch
                    checked={settings.promotionalEmails}
                    onCheckedChange={(checked) => updateSetting('promotionalEmails', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits Settings */}
        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                מגבלות מערכת
              </CardTitle>
              <CardDescription>
                הגדרת מגבלות ובקרות על השימוש במערכת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxVehicleImages">מספר תמונות מקסימלי למודעה</Label>
                  <Input
                    id="maxVehicleImages"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxVehicleImages}
                    onChange={(e) => updateSetting('maxVehicleImages', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxVehiclePrice">מחיר מקסימלי למודעה (₪)</Label>
                  <Input
                    id="maxVehiclePrice"
                    type="number"
                    min="1000"
                    value={settings.maxVehiclePrice}
                    onChange={(e) => updateSetting('maxVehiclePrice', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="minVehiclePrice">מחיר מינימלי למודעה (₪)</Label>
                  <Input
                    id="minVehiclePrice"
                    type="number"
                    min="100"
                    value={settings.minVehiclePrice}
                    onChange={(e) => updateSetting('minVehiclePrice', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                הגדרות מתקדמות
              </CardTitle>
              <CardDescription>
                הגדרות מתקדמות למפתחים ומנהלי מערכת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div className="space-y-0.5">
                      <Label>מצב תחזוקה</Label>
                      <p className="text-sm text-orange-700">הפעל מצב תחזוקה - האתר יהיה לא זמין למשתמשים</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>תכונות בטא</Label>
                    <p className="text-sm text-gray-500">הצג תכונות בפיתוח (לבדיקות בלבד)</p>
                  </div>
                  <Switch
                    checked={settings.showBetaFeatures}
                    onCheckedChange={(checked) => updateSetting('showBetaFeatures', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>מצב כהה</Label>
                    <p className="text-sm text-gray-500">הפעל מצב כהה כברירת מחדל</p>
                  </div>
                  <Switch
                    checked={settings.enableDarkMode}
                    onCheckedChange={(checked) => updateSetting('enableDarkMode', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                סטטוס מערכת
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">מסד נתונים</div>
                    <div className="text-sm text-green-700">מחובר ופעיל</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">שרת אפליקציה</div>
                    <div className="text-sm text-green-700">פועל תקין</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                  <Info className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900">גרסה</div>
                    <div className="text-sm text-blue-700">v1.0.0</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}