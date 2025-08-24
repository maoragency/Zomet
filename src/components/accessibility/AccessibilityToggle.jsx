import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Accessibility, 
  Eye, 
  Type, 
  Pause, 
  Volume2, 
  Keyboard, 
  Focus, 
  RotateCcw,
  Settings,
  Palette,
  BookOpen,
  ZoomIn,
  Mic,
  Ruler,
  Link,
  Image,
  HelpCircle,
  Monitor,
  MousePointer,
  ExternalLink,
  TestTube
} from 'lucide-react';
import AccessibilityPanel from './AccessibilityPanel';
import AccessibilityTester from './AccessibilityTester';
import { useAccessibility, useAccessibilityDispatch, accessibilityActions } from '@/contexts/AccessibilityContext';
import { cn } from '@/lib/utils';

export function AccessibilityToggle({ className, variant = "outline", size = "default" }) {
  const accessibility = useAccessibility();
  const dispatch = useAccessibilityDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showTester, setShowTester] = useState(false);

  // Count active accessibility features
  useEffect(() => {
    let count = 0;
    if (accessibility.highContrast) count++;
    if (accessibility.fontSize !== 'normal') count++;
    if (accessibility.reducedMotion) count++;
    if (accessibility.screenReaderMode) count++;
    if (accessibility.colorBlindMode) count++;
    if (accessibility.dyslexiaMode) count++;
    if (accessibility.magnifier) count++;
    if (accessibility.voiceNavigation) count++;
    if (accessibility.readingGuide) count++;
    if (accessibility.linkHighlight) count++;
    if (accessibility.tooltipMode) count++;
    setActiveCount(count);
  }, [accessibility]);

  const handleToggleAccessibility = () => {
    dispatch(accessibilityActions.toggleAccessibility());
    const message = !accessibility.isEnabled ? 'מצב נגישות הופעל' : 'מצב נגישות בוטל';
    document.dispatchEvent(new CustomEvent('accessibility-announce', {
      detail: { message }
    }));
  };

  const handleHighContrastChange = (checked) => {
    dispatch(accessibilityActions.setHighContrast(checked));
  };

  const handleFontSizeChange = (size) => {
    dispatch(accessibilityActions.setFontSize(size));
  };

  const handleReducedMotionChange = (checked) => {
    dispatch(accessibilityActions.setReducedMotion(checked));
  };

  const handleScreenReaderModeChange = (checked) => {
    dispatch(accessibilityActions.setScreenReaderMode(checked));
  };

  const handleKeyboardNavigationChange = (checked) => {
    dispatch(accessibilityActions.setKeyboardNavigation(checked));
  };

  const handleFocusVisibleChange = (checked) => {
    dispatch(accessibilityActions.setFocusVisible(checked));
  };

  const handleAnnouncementsChange = (checked) => {
    dispatch(accessibilityActions.setAnnouncements(checked));
  };

  const handleAutoPlayChange = (checked) => {
    dispatch(accessibilityActions.setAutoPlay(checked));
  };

  const handleColorBlindModeChange = (checked) => {
    dispatch(accessibilityActions.setColorBlindMode(checked));
  };

  const handleDyslexiaModeChange = (checked) => {
    dispatch(accessibilityActions.setDyslexiaMode(checked));
  };

  const handleMagnifierChange = (checked) => {
    dispatch(accessibilityActions.setMagnifier(checked));
  };

  const handleVoiceNavigationChange = (checked) => {
    dispatch(accessibilityActions.setVoiceNavigation(checked));
  };

  const handleReadingGuideChange = (checked) => {
    dispatch(accessibilityActions.setReadingGuide(checked));
  };

  const handleLinkHighlightChange = (checked) => {
    dispatch(accessibilityActions.setLinkHighlight(checked));
  };

  const handleImageDescriptionsChange = (checked) => {
    dispatch(accessibilityActions.setImageDescriptions(checked));
  };

  const handleTooltipModeChange = (checked) => {
    dispatch(accessibilityActions.setTooltipMode(checked));
  };

  const handleResetSettings = () => {
    dispatch(accessibilityActions.resetSettings());
    setIsOpen(false);
  };

  const fontSizeLabels = {
    small: 'קטן',
    normal: 'רגיל',
    large: 'גדול',
    'extra-large': 'גדול מאוד'
  };

  return (
    <TooltipProvider>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={variant}
                size={size}
                className={cn(
                  "relative transition-all duration-300",
                  accessibility.isEnabled && "bg-gradient-to-r from-blue-100 to-green-100 border-blue-400 text-blue-800 shadow-lg",
                  !accessibility.isEnabled && "hover:bg-gray-50",
                  className
                )}
                aria-label={`הגדרות נגישות${activeCount > 0 ? ` - ${activeCount} תכונות פעילות` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="menu"
              >
                <Accessibility className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  accessibility.isEnabled && "scale-110"
                )} />
                {accessibility.isEnabled && activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {activeCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>הגדרות נגישות</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent 
          align="end" 
          className="w-96 max-h-[80vh] overflow-y-auto" 
          dir="rtl"
          aria-label="תפריט הגדרות נגישות"
        >
          <DropdownMenuLabel className="text-right font-semibold">
            הגדרות נגישות
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Main Accessibility Toggle */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4" />
              <span>הפעל מצב נגישות</span>
            </div>
            <Switch
              checked={accessibility.isEnabled}
              onCheckedChange={handleToggleAccessibility}
              aria-label="הפעל או בטל מצב נגישות"
            />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* High Contrast */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>ניגודיות גבוהה</span>
            </div>
            <Switch
              checked={accessibility.highContrast}
              onCheckedChange={handleHighContrastChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל ניגודיות גבוהה"
            />
          </DropdownMenuItem>

          {/* Font Size */}
          <DropdownMenuLabel className="text-right text-sm text-gray-600 mt-2">
            גודל גופן
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup 
            value={accessibility.fontSize} 
            onValueChange={handleFontSizeChange}
          >
            {Object.entries(fontSizeLabels).map(([size, label]) => (
              <DropdownMenuRadioItem 
                key={size} 
                value={size}
                disabled={!accessibility.isEnabled}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Type className="w-4 h-4" />
                <span>{label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Reduced Motion */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              <span>הפחת אנימציות</span>
            </div>
            <Switch
              checked={accessibility.reducedMotion}
              onCheckedChange={handleReducedMotionChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל הפחתת אנימציות"
            />
          </DropdownMenuItem>

          {/* Screen Reader Mode */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>מצב קורא מסך</span>
            </div>
            <Switch
              checked={accessibility.screenReaderMode}
              onCheckedChange={handleScreenReaderModeChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל מצב קורא מסך"
            />
          </DropdownMenuItem>

          {/* Keyboard Navigation */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              <span>ניווט במקלדת</span>
            </div>
            <Switch
              checked={accessibility.keyboardNavigation}
              onCheckedChange={handleKeyboardNavigationChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל ניווט במקלדת"
            />
          </DropdownMenuItem>

          {/* Focus Visible */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Focus className="w-4 h-4" />
              <span>הדגש פוקוס</span>
            </div>
            <Switch
              checked={accessibility.focusVisible}
              onCheckedChange={handleFocusVisibleChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל הדגשת פוקוס"
            />
          </DropdownMenuItem>

          {/* Auto-play Control */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              <span>עצור הפעלה אוטומטית</span>
            </div>
            <Switch
              checked={!accessibility.autoPlay}
              onCheckedChange={(checked) => handleAutoPlayChange(!checked)}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל עצירת הפעלה אוטומטית"
            />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Advanced Accessibility Features */}
          <DropdownMenuLabel className="text-right text-sm text-gray-600 mt-2">
            תכונות נגישות מתקדמות
          </DropdownMenuLabel>

          {/* Color Blind Mode */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span>מצב עיוורון צבעים</span>
            </div>
            <Switch
              checked={accessibility.colorBlindMode}
              onCheckedChange={handleColorBlindModeChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל מצב עיוורון צבעים"
            />
          </DropdownMenuItem>

          {/* Dyslexia Mode */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>מצב דיסלקציה</span>
            </div>
            <Switch
              checked={accessibility.dyslexiaMode}
              onCheckedChange={handleDyslexiaModeChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל מצב דיסלקציה"
            />
          </DropdownMenuItem>

          {/* Screen Magnifier */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <ZoomIn className="w-4 h-4" />
              <span>זכוכית מגדלת</span>
            </div>
            <Switch
              checked={accessibility.magnifier}
              onCheckedChange={handleMagnifierChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל זכוכית מגדלת"
            />
          </DropdownMenuItem>

          {/* Voice Navigation */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span>ניווט קולי</span>
            </div>
            <Switch
              checked={accessibility.voiceNavigation}
              onCheckedChange={handleVoiceNavigationChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל ניווט קולי"
            />
          </DropdownMenuItem>

          {/* Reading Guide */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              <span>מדריך קריאה</span>
            </div>
            <Switch
              checked={accessibility.readingGuide}
              onCheckedChange={handleReadingGuideChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל מדריך קריאה"
            />
          </DropdownMenuItem>

          {/* Link Highlight */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              <span>הדגש קישורים</span>
            </div>
            <Switch
              checked={accessibility.linkHighlight}
              onCheckedChange={handleLinkHighlightChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל הדגשת קישורים"
            />
          </DropdownMenuItem>

          {/* Image Descriptions */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span>תיאורי תמונות</span>
            </div>
            <Switch
              checked={accessibility.imageDescriptions}
              onCheckedChange={handleImageDescriptionsChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל תיאורי תמונות"
            />
          </DropdownMenuItem>

          {/* Enhanced Tooltips */}
          <DropdownMenuItem 
            className="flex items-center justify-between cursor-pointer"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span>רמזים מורחבים</span>
            </div>
            <Switch
              checked={accessibility.tooltipMode}
              onCheckedChange={handleTooltipModeChange}
              disabled={!accessibility.isEnabled}
              aria-label="הפעל או בטל רמזים מורחבים"
            />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Advanced Panel */}
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer text-blue-600 focus:text-blue-600"
            onSelect={() => {
              setShowPanel(true);
              setIsOpen(false);
            }}
          >
            <ExternalLink className="w-4 h-4" />
            <span>מרכז נגישות מתקדם</span>
          </DropdownMenuItem>

          {/* Accessibility Tester */}
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer text-purple-600 focus:text-purple-600"
            onSelect={() => {
              setShowTester(true);
              setIsOpen(false);
            }}
          >
            <TestTube className="w-4 h-4" />
            <span>בודק נגישות אוטומטי</span>
          </DropdownMenuItem>

          {/* Reset Settings */}
          <DropdownMenuItem 
            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
            onSelect={handleResetSettings}
          >
            <RotateCcw className="w-4 h-4" />
            <span>איפוס הגדרות</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Advanced Accessibility Panel */}
      <AccessibilityPanel 
        isOpen={showPanel} 
        onClose={() => setShowPanel(false)} 
      />

      {/* Accessibility Tester */}
      <AccessibilityTester 
        isOpen={showTester} 
        onClose={() => setShowTester(false)} 
      />
    </TooltipProvider>
  );
}

export default AccessibilityToggle;