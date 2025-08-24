import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Accessibility, 
  Move, 
  Maximize2, 
  Minimize2, 
  X, 
  Settings,
  Eye,
  Type,
  Pause,
  Volume2,
  Keyboard,
  Palette,
  BookOpen,
  ZoomIn,
  Mic,
  Ruler,
  Link,
  RotateCcw,
  Info,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Power,
  PowerOff
} from 'lucide-react';
import { useAccessibility, useAccessibilityDispatch, accessibilityActions } from '@/contexts/AccessibilityContext';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { announceToScreenReader } from '@/utils/accessibility';

const STORAGE_KEY = 'zomet-floating-accessibility-settings';
const DEFAULT_POSITION = { x: 20, y: 100 };
const DEFAULT_SIZE = { width: 320, height: 480 };
const MIN_SIZE = { width: 280, height: 300 };
const MAX_SIZE = { width: 600, height: 800 };

export function FloatingAccessibilityButton() {
  const accessibility = useAccessibility();
  const dispatch = useAccessibilityDispatch();
  
  // UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [activeTab, setActiveTab] = useState('basic');
  const [isVisible, setIsVisible] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  // Refs
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0 });
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });
  const lastScrollY = useRef(0);

  // Check if button should be shown
  const shouldShowButton = accessibility.floatingButton && 
                          !accessibility.buttonPermanentlyClosed && 
                          !accessibility.buttonClosed;

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        setPosition(settings.position || DEFAULT_POSITION);
        setSize(settings.size || DEFAULT_SIZE);
      }
    } catch (error) {
      console.warn('Failed to load floating accessibility settings:', error);
    }
  }, []);

  // Handle scroll visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Always keep button visible when scrolling
      if (Math.abs(currentScrollY - lastScrollY.current) > 5) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    try {
      const settings = {
        position,
        size
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save floating accessibility settings:', error);
    }
  }, [position, size]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Drag functionality
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.no-drag')) return;
    
    setIsDragging(true);
    dragRef.current = {
      isDragging: true,
      startX: e.clientX - position.x,
      startY: e.clientY - position.y
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (dragRef.current.isDragging) {
      const buttonWidth = isExpanded ? size.width : 64;
      const buttonHeight = isExpanded ? size.height : 64;
      const newX = Math.max(0, Math.min(window.innerWidth - buttonWidth, e.clientX - dragRef.current.startX));
      const newY = Math.max(0, Math.min(window.innerHeight - buttonHeight, e.clientY - dragRef.current.startY));
      
      setPosition({ x: newX, y: newY });
      dispatch(accessibilityActions.setButtonPosition({ x: newX, y: newY }));
    }
    
    if (resizeRef.current.isResizing) {
      const newWidth = Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, resizeRef.current.startWidth + (e.clientX - resizeRef.current.startX)));
      const newHeight = Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, resizeRef.current.startHeight + (e.clientY - resizeRef.current.startY)));
      
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isExpanded, size, dispatch]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    dragRef.current.isDragging = false;
    resizeRef.current.isResizing = false;
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Resize functionality
  const handleResizeStart = useCallback((e) => {
    setIsResizing(true);
    resizeRef.current = {
      isResizing: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
    e.stopPropagation();
  }, [size, handleMouseMove, handleMouseUp]);

  // Handle temporary close
  const handleTemporaryClose = useCallback(() => {
    dispatch(accessibilityActions.setButtonClosed(true));
    announceToScreenReader('כפתור נגישות הוסתר זמנית');
  }, [dispatch]);

  // Handle permanent close
  const handlePermanentClose = useCallback(() => {
    dispatch(accessibilityActions.setButtonPermanentlyClosed(true));
    announceToScreenReader('כפתור נגישות הוסתר עד הפעלה מחדש');
  }, [dispatch]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    dispatch(accessibilityActions.setButtonMinimized(true));
    setIsExpanded(false);
    announceToScreenReader('כפתור נגישות מוזער');
  }, [dispatch]);

  // Handle restore from minimize
  const handleRestore = useCallback(() => {
    dispatch(accessibilityActions.setButtonMinimized(false));
    announceToScreenReader('כפתור נגישות שוחזר');
  }, [dispatch]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!shouldShowButton) return;

      // Alt + Shift + A: Toggle floating panel
      if (e.altKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (accessibility.buttonMinimized) {
          handleRestore();
        } else {
          setIsExpanded(!isExpanded);
          announceToScreenReader(isExpanded ? 'פאנל נגישות נסגר' : 'פאנל נגישות נפתח');
        }
      }
      
      // Escape: Close panel or minimize
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false);
          announceToScreenReader('פאנל נגישות נסגר');
        } else if (!accessibility.buttonMinimized) {
          handleMinimize();
        }
      }

      // Ctrl + Alt + H: Hide temporarily
      if (e.ctrlKey && e.altKey && e.key === 'H') {
        e.preventDefault();
        handleTemporaryClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, shouldShowButton, accessibility.buttonMinimized, handleRestore, handleMinimize, handleTemporaryClose]);

  // Count active features
  const activeFeatures = Object.entries(accessibility).filter(([key, value]) => {
    if (key === 'isEnabled' || key === 'textDirection' || key === 'announcements') return false;
    return value === true || (key === 'fontSize' && value !== 'normal');
  }).length;

  // Feature configurations
  const basicFeatures = [
    {
      key: 'highContrast',
      icon: Eye,
      title: 'ניגודיות גבוהה',
      description: 'משפר ניגודיות צבעים',
      value: accessibility.highContrast,
      onChange: (value) => dispatch(accessibilityActions.setHighContrast(value))
    },
    {
      key: 'reducedMotion',
      icon: Pause,
      title: 'הפחתת אנימציות',
      description: 'מפחית תנועות ואנימציות',
      value: accessibility.reducedMotion,
      onChange: (value) => dispatch(accessibilityActions.setReducedMotion(value))
    },
    {
      key: 'screenReaderMode',
      icon: Volume2,
      title: 'מצב קורא מסך',
      description: 'מותאם לקוראי מסך',
      value: accessibility.screenReaderMode,
      onChange: (value) => dispatch(accessibilityActions.setScreenReaderMode(value))
    },
    {
      key: 'keyboardNavigation',
      icon: Keyboard,
      title: 'ניווט במקלדת',
      description: 'שיפור ניווט במקלדת',
      value: accessibility.keyboardNavigation,
      onChange: (value) => dispatch(accessibilityActions.setKeyboardNavigation(value))
    }
  ];

  const advancedFeatures = [
    {
      key: 'colorBlindMode',
      icon: Palette,
      title: 'מצב עיוורון צבעים',
      description: 'התאמה לעיוורון צבעים',
      value: accessibility.colorBlindMode,
      onChange: (value) => dispatch(accessibilityActions.setColorBlindMode(value))
    },
    {
      key: 'dyslexiaMode',
      icon: BookOpen,
      title: 'מצב דיסלקציה',
      description: 'גופן מותאם לדיסלקציה',
      value: accessibility.dyslexiaMode,
      onChange: (value) => dispatch(accessibilityActions.setDyslexiaMode(value))
    },
    {
      key: 'magnifier',
      icon: ZoomIn,
      title: 'זכוכית מגדלת',
      description: 'הגדלת אזור המסך',
      value: accessibility.magnifier,
      onChange: (value) => dispatch(accessibilityActions.setMagnifier(value))
    },
    {
      key: 'voiceNavigation',
      icon: Mic,
      title: 'ניווט קולי',
      description: 'פקודות קול',
      value: accessibility.voiceNavigation,
      onChange: (value) => dispatch(accessibilityActions.setVoiceNavigation(value))
    },
    {
      key: 'readingGuide',
      icon: Ruler,
      title: 'מדריך קריאה',
      description: 'קו מנחה לקריאה',
      value: accessibility.readingGuide,
      onChange: (value) => dispatch(accessibilityActions.setReadingGuide(value))
    },
    {
      key: 'linkHighlight',
      icon: Link,
      title: 'הדגשת קישורים',
      description: 'הדגשה ברורה של קישורים',
      value: accessibility.linkHighlight,
      onChange: (value) => dispatch(accessibilityActions.setLinkHighlight(value))
    }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'קטן' },
    { value: 'normal', label: 'רגיל' },
    { value: 'large', label: 'גדול' },
    { value: 'extra-large', label: 'גדול מאוד' }
  ];

  const FeatureToggle = ({ feature }) => (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className={cn(
          "p-2 rounded-md",
          feature.value ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
        )}>
          <feature.icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{feature.title}</div>
          <div className="text-xs text-gray-500 truncate">{feature.description}</div>
        </div>
      </div>
      <Switch
        checked={feature.value}
        onCheckedChange={feature.onChange}
        disabled={!accessibility.isEnabled}
        className="no-drag"
        aria-label={`${feature.value ? 'בטל' : 'הפעל'} ${feature.title}`}
      />
    </div>
  );

  // Debug logging
  console.log('FloatingAccessibilityButton Debug:', {
    floatingButton: accessibility.floatingButton,
    buttonPermanentlyClosed: accessibility.buttonPermanentlyClosed,
    buttonClosed: accessibility.buttonClosed,
    shouldShowButton,
    buttonMinimized: accessibility.buttonMinimized
  });

  // Don't render if button should not be shown
  if (!shouldShowButton) {
    console.log('FloatingAccessibilityButton: Not showing button', { shouldShowButton });
    return null;
  }

  // Render minimized state
  if (accessibility.buttonMinimized) {
    return (
      <div
        className={cn(
          "fixed z-[9999] select-none transition-all duration-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-70 translate-y-1"
        )}
        style={{ left: position.x, top: position.y }}
      >
        <Button
          ref={buttonRef}
          variant="outline"
          size="sm"
          className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg border-2 transition-all duration-300 cursor-move hover:scale-105",
            accessibility.isEnabled 
              ? "bg-gradient-to-r from-blue-500 to-green-500 border-blue-400 text-white shadow-blue-200" 
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50",
            isDragging && "scale-110 shadow-2xl"
          )}
          onClick={handleRestore}
          onMouseDown={handleMouseDown}
          aria-label={`כפתור נגישות צף - ${activeFeatures} תכונות פעילות - לחץ לשחזור`}
          title="לחץ לשחזור, גרור להזזה"
        >
          <Accessibility className="w-4 h-4 md:w-5 md:h-5" />
          {activeFeatures > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {activeFeatures > 9 ? '9+' : activeFeatures}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-[9999] select-none transition-all duration-300 floating-accessibility-button",
        isVisible ? "opacity-100 translate-y-0" : "opacity-90 translate-y-1",
        isDragging && "dragging"
      )}
      style={{ left: position.x, top: position.y }}
    >
      {/* Floating Button */}
      {!isExpanded && (
        <Button
          ref={buttonRef}
          variant="outline"
          className={cn(
            "w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl border-2 transition-all duration-300 cursor-move hover:scale-105",
            accessibility.isEnabled 
              ? "bg-gradient-to-r from-blue-500 to-green-500 border-blue-400 text-white shadow-blue-200" 
              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50",
            isDragging && "scale-110 shadow-2xl"
          )}
          onClick={() => setIsExpanded(true)}
          onMouseDown={handleMouseDown}
          aria-label={`כפתור נגישות צף - ${activeFeatures} תכונות פעילות`}
          title="לחץ לפתיחה, גרור להזזה"
        >
          <Accessibility className="w-5 h-5 md:w-6 md:h-6" />
          {activeFeatures > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {activeFeatures > 9 ? '9+' : activeFeatures}
            </span>
          )}
        </Button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <Card
          ref={panelRef}
          className={cn(
            "shadow-2xl border-2 border-blue-200 bg-white/95 backdrop-blur-sm floating-accessibility-button-panel",
            isDragging && "scale-105",
            isResizing && "border-blue-400"
          )}
          style={{ 
            width: size.width, 
            height: size.height,
            maxHeight: '90vh',
            overflow: 'hidden'
          }}
          dir="rtl"
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-green-500 text-white cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-3">
              <Accessibility className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">מרכז נגישות</h3>
                <p className="text-xs opacity-90">{activeFeatures} תכונות פעילות</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 no-drag">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 text-white hover:bg-white/20"
                onClick={handleMinimize}
                aria-label="מזער"
                title="מזער לכפתור קטן"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 text-white hover:bg-white/20"
                onClick={() => setIsExpanded(false)}
                aria-label="סגור פאנל"
                title="סגור פאנל (הכפתור יישאר)"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 text-white hover:bg-white/20"
                onClick={() => setShowCloseConfirm(true)}
                aria-label="הסתר כפתור"
                title="הסתר כפתור זמנית או לצמיתות"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-0 h-full overflow-hidden flex flex-col">
            {/* Main Toggle */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    accessibility.isEnabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                  )}>
                    <Accessibility className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">מצב נגישות</div>
                    <div className="text-xs text-gray-500">
                      {accessibility.isEnabled ? 'פעיל' : 'כבוי'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={accessibility.isEnabled}
                  onCheckedChange={() => dispatch(accessibilityActions.toggleAccessibility())}
                  className="no-drag"
                  aria-label="הפעל או בטל מצב נגישות"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white no-drag">
              <Button
                variant={activeTab === 'basic' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('basic')}
              >
                בסיסי
              </Button>
              <Button
                variant={activeTab === 'advanced' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('advanced')}
              >
                מתקדם
              </Button>
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 rounded-none"
                onClick={() => setActiveTab('settings')}
              >
                הגדרות
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto floating-accessibility-button-content">
              {activeTab === 'basic' && (
                <div className="p-2 space-y-1">
                  {basicFeatures.map((feature) => (
                    <FeatureToggle key={feature.key} feature={feature} />
                  ))}
                  
                  {/* Font Size */}
                  <div className="p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-md bg-purple-100 text-purple-600">
                        <Type className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">גודל גופן</div>
                        <div className="text-xs text-gray-500">התאמת גודל הטקסט</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 no-drag">
                      {fontSizeOptions.map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={accessibility.fontSize === value ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs"
                          onClick={() => dispatch(accessibilityActions.setFontSize(value))}
                          disabled={!accessibility.isEnabled}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="p-2 space-y-1">
                  {advancedFeatures.map((feature) => (
                    <FeatureToggle key={feature.key} feature={feature} />
                  ))}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      הגדרות פאנל
                    </h4>
                    
                    <div className="space-y-2 no-drag">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setPosition(DEFAULT_POSITION);
                          setSize(DEFAULT_SIZE);
                          dispatch(accessibilityActions.setButtonPosition(DEFAULT_POSITION));
                        }}
                      >
                        <RotateCcw className="w-4 h-4 ml-2" />
                        איפוס מיקום וגודל
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-orange-600 hover:text-orange-700"
                        onClick={handleTemporaryClose}
                      >
                        <EyeOff className="w-4 h-4 ml-2" />
                        הסתר זמנית
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-red-600 hover:text-red-700"
                        onClick={() => setShowCloseConfirm(true)}
                      >
                        <PowerOff className="w-4 h-4 ml-2" />
                        הסתר לצמיתות
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => dispatch(accessibilityActions.resetSettings())}
                      >
                        <RotateCcw className="w-4 h-4 ml-2" />
                        איפוס הגדרות נגישות
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      קיצורי מקלדת
                    </h4>
                    <div className="text-xs space-y-1 text-gray-600">
                      <div>Alt + Shift + A: פתח/סגור פאנל</div>
                      <div>Escape: סגור פאנל או מזער</div>
                      <div>Ctrl + Alt + H: הסתר זמנית</div>
                      <div>Ctrl + Plus/Minus: גודל גופן</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize resize-handle opacity-50 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeStart}
            title="גרור לשינוי גודל"
          >
            <div className="w-full h-full bg-gray-400 rounded-tl-md flex items-end justify-end p-1">
              <div className="w-2 h-2 border-r border-b border-gray-600"></div>
            </div>
          </div>
        </Card>
      )}

      {/* Close Confirmation Dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] close-confirmation-dialog" dir="rtl">
          <Card className="w-96 max-w-[90vw] mx-4">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6 text-orange-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">הסתרת כפתור נגישות</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    איך תרצה להסתיר את כפתור הנגישות?
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      handleTemporaryClose();
                      setShowCloseConfirm(false);
                    }}
                  >
                    <EyeOff className="w-4 h-4 ml-2" />
                    <div className="text-right">
                      <div className="font-medium">הסתר זמנית</div>
                      <div className="text-xs text-gray-500">ניתן לפתוח מחדש דרך תפריט הגדרות</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => {
                      handlePermanentClose();
                      setShowCloseConfirm(false);
                    }}
                  >
                    <PowerOff className="w-4 h-4 ml-2" />
                    <div className="text-right">
                      <div className="font-medium">הסתר לצמיתות</div>
                      <div className="text-xs text-gray-500">יופיע מחדש רק בפעלה הבאה של האתר</div>
                    </div>
                  </Button>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowCloseConfirm(false)}
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default FloatingAccessibilityButton;