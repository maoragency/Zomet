import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Accessibility, 
  Eye, 
  Type, 
  Pause, 
  Volume2, 
  Keyboard, 
  Focus, 
  RotateCcw,
  Palette,
  BookOpen,
  ZoomIn,
  Mic,
  Ruler,
  Link,
  Image,
  HelpCircle,
  X,
  Check,
  Info
} from 'lucide-react';
import { useAccessibility, useAccessibilityDispatch, accessibilityActions } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

export function AccessibilityPanel({ isOpen, onClose }) {
  const accessibility = useAccessibility();
  const dispatch = useAccessibilityDispatch();
  const [activeTab, setActiveTab] = useState('basic');

  if (!isOpen) return null;

  const basicFeatures = [
    {
      key: 'highContrast',
      icon: Eye,
      title: 'ניגודיות גבוהה',
      description: 'משפר את הניגודיות לקריאה טובה יותר',
      action: () => dispatch(accessibilityActions.setHighContrast(!accessibility.highContrast)),
      active: accessibility.highContrast
    },
    {
      key: 'fontSize',
      icon: Type,
      title: 'גודל גופן',
      description: 'התאם את גודל הטקסט לנוחותך',
      component: 'fontSizeSelector'
    },
    {
      key: 'reducedMotion',
      icon: Pause,
      title: 'הפחת אנימציות',
      description: 'מפחית תנועות ואנימציות',
      action: () => dispatch(accessibilityActions.setReducedMotion(!accessibility.reducedMotion)),
      active: accessibility.reducedMotion
    },
    {
      key: 'screenReaderMode',
      icon: Volume2,
      title: 'מצב קורא מסך',
      description: 'מותאם לקוראי מסך',
      action: () => dispatch(accessibilityActions.setScreenReaderMode(!accessibility.screenReaderMode)),
      active: accessibility.screenReaderMode
    }
  ];

  const advancedFeatures = [
    {
      key: 'colorBlindMode',
      icon: Palette,
      title: 'מצב עיוורון צבעים',
      description: 'התאמה לאנשים עם עיוורון צבעים',
      action: () => dispatch(accessibilityActions.setColorBlindMode(!accessibility.colorBlindMode)),
      active: accessibility.colorBlindMode
    },
    {
      key: 'dyslexiaMode',
      icon: BookOpen,
      title: 'מצב דיסלקציה',
      description: 'גופן וריווח מותאמים לדיסלקציה',
      action: () => dispatch(accessibilityActions.setDyslexiaMode(!accessibility.dyslexiaMode)),
      active: accessibility.dyslexiaMode
    },
    {
      key: 'magnifier',
      icon: ZoomIn,
      title: 'זכוכית מגדלת',
      description: 'הגדלת אזור המסך סביב העכבר',
      action: () => dispatch(accessibilityActions.setMagnifier(!accessibility.magnifier)),
      active: accessibility.magnifier
    },
    {
      key: 'voiceNavigation',
      icon: Mic,
      title: 'ניווט קולי',
      description: 'שליטה באתר באמצעות פקודות קול',
      action: () => dispatch(accessibilityActions.setVoiceNavigation(!accessibility.voiceNavigation)),
      active: accessibility.voiceNavigation
    },
    {
      key: 'readingGuide',
      icon: Ruler,
      title: 'מדריך קריאה',
      description: 'קו מנחה לקריאה נוחה יותר',
      action: () => dispatch(accessibilityActions.setReadingGuide(!accessibility.readingGuide)),
      active: accessibility.readingGuide
    },
    {
      key: 'linkHighlight',
      icon: Link,
      title: 'הדגש קישורים',
      description: 'הדגשה ברורה של כל הקישורים',
      action: () => dispatch(accessibilityActions.setLinkHighlight(!accessibility.linkHighlight)),
      active: accessibility.linkHighlight
    }
  ];

  const FontSizeSelector = () => (
    <div className="grid grid-cols-2 gap-2">
      {[
        { value: 'small', label: 'קטן' },
        { value: 'normal', label: 'רגיל' },
        { value: 'large', label: 'גדול' },
        { value: 'extra-large', label: 'גדול מאוד' }
      ].map(({ value, label }) => (
        <Button
          key={value}
          variant={accessibility.fontSize === value ? 'default' : 'outline'}
          size="sm"
          onClick={() => dispatch(accessibilityActions.setFontSize(value))}
          className="text-xs"
        >
          {label}
        </Button>
      ))}
    </div>
  );

  const FeatureCard = ({ feature }) => (
    <Card className={cn(
      "transition-all duration-200 cursor-pointer hover:shadow-md",
      feature.active && "ring-2 ring-blue-500 bg-gradient-to-r from-blue-50 to-amber-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            feature.active ? "bg-gradient-to-r from-blue-50 to-amber-500 text-white" : "bg-gray-100 text-gray-600"
          )}>
            <feature.icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">{feature.title}</h4>
              {feature.active && <Check className="w-4 h-4 text-green-600" />}
            </div>
            <p className="text-xs text-gray-600 mb-3">{feature.description}</p>
            {feature.component === 'fontSizeSelector' ? (
              <FontSizeSelector />
            ) : (
              <Button
                variant={feature.active ? 'secondary' : 'outline'}
                size="sm"
                onClick={feature.action}
                className="w-full text-xs"
              >
                {feature.active ? 'בטל' : 'הפעל'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Accessibility className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">מרכז נגישות</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  התאם את האתר לצרכים שלך
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Status Bar */}
          <div className="flex items-center gap-4 mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                accessibility.isEnabled ? "bg-green-500" : "bg-gray-400"
              )} />
              <span className="text-sm font-medium">
                {accessibility.isEnabled ? 'מצב נגישות פעיל' : 'מצב נגישות כבוי'}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="secondary" className="text-xs">
              {Object.values(accessibility).filter(Boolean).length - 1} תכונות פעילות
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'basic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('basic')}
            >
              תכונות בסיסיות
            </Button>
            <Button
              variant={activeTab === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('advanced')}
            >
              תכונות מתקדמות
            </Button>
          </div>

          {/* Main Toggle */}
          <Card className="mb-6 border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Accessibility className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">הפעל מצב נגישות</h3>
                    <p className="text-sm text-gray-600">
                      הפעל את כל תכונות הנגישות באתר
                    </p>
                  </div>
                </div>
                <Button
                  variant={accessibility.isEnabled ? 'default' : 'outline'}
                  onClick={() => dispatch(accessibilityActions.toggleAccessibility())}
                  className="px-6"
                >
                  {accessibility.isEnabled ? 'בטל' : 'הפעל'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(activeTab === 'basic' ? basicFeatures : advancedFeatures).map((feature) => (
              <FeatureCard key={feature.key} feature={feature} />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              פעולות מהירות
            </h4>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(accessibilityActions.resetSettings())}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 ml-1" />
                איפוס הגדרות
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  dispatch(accessibilityActions.setHighContrast(true));
                  dispatch(accessibilityActions.setFontSize('large'));
                  dispatch(accessibilityActions.setFocusVisible(true));
                }}
                className="text-xs"
              >
                הגדרות מומלצות
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-800">קיצורי מקלדת</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div>Alt + A: פתח תפריט נגישות</div>
              <div>Alt + H: עבור לתוכן הראשי</div>
              <div>Alt + N: עבור לניווט</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccessibilityPanel;