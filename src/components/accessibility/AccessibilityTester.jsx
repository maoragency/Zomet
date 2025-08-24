import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Keyboard, 
  MousePointer, 
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Download,
  ExternalLink
} from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { ColorContrastChecker } from '@/utils/accessibility';

export function AccessibilityTester({ isOpen, onClose }) {
  const accessibility = useAccessibility();
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const runAccessibilityTests = async () => {
    setIsRunning(true);
    setProgress(0);
    
    const tests = [
      { name: 'כותרות', test: testHeadings },
      { name: 'תוויות ARIA', test: testAriaLabels },
      { name: 'ניגודיות צבעים', test: testColorContrast },
      { name: 'גודל יעדי מגע', test: testTouchTargets },
      { name: 'ניווט במקלדת', test: testKeyboardNavigation },
      { name: 'תמונות', test: testImages },
      { name: 'טפסים', test: testForms },
      { name: 'קישורים', test: testLinks },
      { name: 'מבנה דף', test: testPageStructure },
      { name: 'תמיכה בקוראי מסך', test: testScreenReaderSupport }
    ];

    const results = {};
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      try {
        results[test.name] = await test.test();
      } catch (error) {
        results[test.name] = {
          status: 'error',
          message: `שגיאה בבדיקה: ${error.message}`,
          issues: []
        };
      }
      setProgress(((i + 1) / tests.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UX
    }
    
    setTestResults(results);
    setIsRunning(false);
  };

  // Test functions
  const testHeadings = () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const issues = [];
    let hasH1 = false;
    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level === 1) {
        if (hasH1) {
          issues.push(`יותר מכותרת H1 אחת בדף`);
        }
        hasH1 = true;
      }
      
      if (level > previousLevel + 1) {
        issues.push(`דילוג ברמת כותרת: מ-H${previousLevel} ל-H${level}`);
      }
      
      if (!heading.textContent.trim()) {
        issues.push(`כותרת ריקה: ${heading.tagName}`);
      }
      
      previousLevel = level;
    });

    if (!hasH1) {
      issues.push('לא נמצאה כותרת H1 בדף');
    }

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      message: `נמצאו ${headings.length} כותרות`,
      issues,
      count: headings.length
    };
  };

  const testAriaLabels = () => {
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]'
    );
    const issues = [];

    interactiveElements.forEach((element, index) => {
      const hasLabel = element.getAttribute('aria-label') || 
                     element.getAttribute('aria-labelledby') ||
                     element.textContent.trim() ||
                     element.getAttribute('title') ||
                     element.getAttribute('alt');

      if (!hasLabel) {
        issues.push(`אלמנט אינטראקטיבי ללא תווית: ${element.tagName} (${index + 1})`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      message: `נבדקו ${interactiveElements.length} אלמנטים אינטראקטיביים`,
      issues,
      count: interactiveElements.length
    };
  };

  const testColorContrast = () => {
    const elements = document.querySelectorAll('*');
    const issues = [];
    const checkedPairs = new Set();

    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const pairKey = `${color}-${backgroundColor}`;
        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);
          
          // Simple contrast check (would need more sophisticated implementation)
          const colorRgb = parseColor(color);
          const bgRgb = parseColor(backgroundColor);
          
          if (colorRgb && bgRgb) {
            const ratio = ColorContrastChecker.getContrastRatio(colorRgb, bgRgb);
            if (ratio < 4.5) {
              issues.push(`ניגודיות נמוכה: ${ratio.toFixed(2)} (מינימום 4.5)`);
            }
          }
        }
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : issues.length < 5 ? 'warning' : 'fail',
      message: `נבדקו ${checkedPairs.size} צירופי צבעים`,
      issues: issues.slice(0, 10), // Limit to first 10 issues
      count: checkedPairs.size
    };
  };

  const testTouchTargets = () => {
    const touchTargets = document.querySelectorAll('button, a, input, select, [role="button"]');
    const issues = [];

    touchTargets.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const minSize = 44; // WCAG recommendation
      
      if (rect.width < minSize || rect.height < minSize) {
        issues.push(`יעד מגע קטן מדי: ${Math.round(rect.width)}x${Math.round(rect.height)}px (מינימום ${minSize}x${minSize}px)`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : issues.length < 5 ? 'warning' : 'fail',
      message: `נבדקו ${touchTargets.length} יעדי מגע`,
      issues: issues.slice(0, 10),
      count: touchTargets.length
    };
  };

  const testKeyboardNavigation = () => {
    const focusableElements = document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const issues = [];

    focusableElements.forEach((element, index) => {
      if (element.tabIndex < 0 && element.tabIndex !== -1) {
        issues.push(`tabindex שלילי לא תקין: ${element.tagName} (tabindex="${element.tabIndex}")`);
      }
      
      if (element.tabIndex > 0) {
        issues.push(`tabindex חיובי (לא מומלץ): ${element.tagName} (tabindex="${element.tabIndex}")`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'warning',
      message: `נמצאו ${focusableElements.length} אלמנטים הניתנים לפוקוס`,
      issues,
      count: focusableElements.length
    };
  };

  const testImages = () => {
    const images = document.querySelectorAll('img');
    const issues = [];

    images.forEach((img, index) => {
      if (!img.getAttribute('alt')) {
        issues.push(`תמונה ללא תיאור חלופי: תמונה ${index + 1}`);
      } else if (img.getAttribute('alt').trim() === '') {
        // Empty alt is OK for decorative images
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      message: `נבדקו ${images.length} תמונות`,
      issues,
      count: images.length
    };
  };

  const testForms = () => {
    const formElements = document.querySelectorAll('input, select, textarea');
    const issues = [];

    formElements.forEach((element, index) => {
      const hasLabel = element.getAttribute('aria-label') ||
                      element.getAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${element.id}"]`) ||
                      element.closest('label');

      if (!hasLabel) {
        issues.push(`שדה טופס ללא תווית: ${element.tagName} ${element.type || ''} (${index + 1})`);
      }

      if (element.hasAttribute('required') && !element.getAttribute('aria-required')) {
        issues.push(`שדה חובה ללא aria-required: ${element.tagName} (${index + 1})`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      message: `נבדקו ${formElements.length} שדות טופס`,
      issues,
      count: formElements.length
    };
  };

  const testLinks = () => {
    const links = document.querySelectorAll('a');
    const issues = [];

    links.forEach((link, index) => {
      if (!link.getAttribute('href')) {
        issues.push(`קישור ללא href: קישור ${index + 1}`);
      }
      
      if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
        issues.push(`קישור ללא טקסט או תווית: קישור ${index + 1}`);
      }
      
      if (link.textContent.trim().toLowerCase() === 'לחץ כאן' || 
          link.textContent.trim().toLowerCase() === 'קרא עוד') {
        issues.push(`טקסט קישור לא תיאורי: "${link.textContent.trim()}"`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : issues.length < 3 ? 'warning' : 'fail',
      message: `נבדקו ${links.length} קישורים`,
      issues,
      count: links.length
    };
  };

  const testPageStructure = () => {
    const issues = [];
    
    // Check for landmarks
    const main = document.querySelector('main, [role="main"]');
    const nav = document.querySelector('nav, [role="navigation"]');
    const header = document.querySelector('header, [role="banner"]');
    const footer = document.querySelector('footer, [role="contentinfo"]');

    if (!main) issues.push('לא נמצא אלמנט main או role="main"');
    if (!nav) issues.push('לא נמצא אלמנט nav או role="navigation"');
    if (!header) issues.push('לא נמצא אלמנט header או role="banner"');
    if (!footer) issues.push('לא נמצא אלמנט footer או role="contentinfo"');

    // Check for skip links
    const skipLinks = document.querySelectorAll('a[href^="#"]');
    if (skipLinks.length === 0) {
      issues.push('לא נמצאו קישורי דילוג');
    }

    return {
      status: issues.length === 0 ? 'pass' : issues.length < 3 ? 'warning' : 'fail',
      message: 'בדיקת מבנה דף ואזורי ציון',
      issues,
      count: 4
    };
  };

  const testScreenReaderSupport = () => {
    const issues = [];
    
    // Check for live regions
    const liveRegions = document.querySelectorAll('[aria-live]');
    
    // Check for proper ARIA usage
    const ariaElements = document.querySelectorAll('[aria-expanded], [aria-selected], [aria-checked]');
    
    ariaElements.forEach((element) => {
      const expanded = element.getAttribute('aria-expanded');
      const selected = element.getAttribute('aria-selected');
      const checked = element.getAttribute('aria-checked');
      
      if (expanded && !['true', 'false'].includes(expanded)) {
        issues.push(`ערך aria-expanded לא תקין: "${expanded}"`);
      }
      if (selected && !['true', 'false'].includes(selected)) {
        issues.push(`ערך aria-selected לא תקין: "${selected}"`);
      }
      if (checked && !['true', 'false', 'mixed'].includes(checked)) {
        issues.push(`ערך aria-checked לא תקין: "${checked}"`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'warning',
      message: `נמצאו ${liveRegions.length} אזורי עדכון חי, ${ariaElements.length} אלמנטי ARIA`,
      issues,
      count: liveRegions.length + ariaElements.length
    };
  };

  // Helper function to parse color values
  const parseColor = (colorStr) => {
    if (colorStr.startsWith('rgb')) {
      const matches = colorStr.match(/\d+/g);
      return matches ? matches.slice(0, 3).map(Number) : null;
    }
    return null;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'fail': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      accessibilitySettings: accessibility,
      testResults,
      summary: {
        total: Object.keys(testResults).length,
        passed: Object.values(testResults).filter(r => r.status === 'pass').length,
        warnings: Object.values(testResults).filter(r => r.status === 'warning').length,
        failed: Object.values(testResults).filter(r => r.status === 'fail').length
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.status === 'pass').length;
  const warningTests = Object.values(testResults).filter(r => r.status === 'warning').length;
  const failedTests = Object.values(testResults).filter(r => r.status === 'fail').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" dir="rtl">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Eye className="w-6 h-6 text-blue-600" />
                בודק נגישות אוטומטי
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                בדיקה מקיפה של תקני WCAG 2.1 AA
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          {totalTests > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">תוצאות כלליות</span>
                <div className="flex gap-2">
                  <Badge className={getStatusColor('pass')}>{passedTests} עברו</Badge>
                  <Badge className={getStatusColor('warning')}>{warningTests} אזהרות</Badge>
                  <Badge className={getStatusColor('fail')}>{failedTests} נכשלו</Badge>
                </div>
              </div>
              <Progress value={(passedTests / totalTests) * 100} className="h-2" />
            </div>
          )}
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runAccessibilityTests} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                {isRunning ? 'בודק...' : 'הרץ בדיקת נגישות'}
              </Button>
              
              {totalTests > 0 && (
                <Button variant="outline" onClick={exportResults}>
                  <Download className="w-4 h-4 ml-2" />
                  ייצא דוח
                </Button>
              )}
            </div>

            {isRunning && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">מריץ בדיקות נגישות...</div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {Object.entries(testResults).map(([testName, result]) => (
              <Card key={testName} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-medium">{testName}</h4>
                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                        
                        {result.issues && result.issues.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-red-700 mb-2">
                              בעיות שנמצאו ({result.issues.length}):
                            </h5>
                            <ul className="text-sm space-y-1">
                              {result.issues.map((issue, index) => (
                                <li key={index} className="text-red-600 flex items-start gap-2">
                                  <span className="text-red-400 mt-1">•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status === 'pass' ? 'עבר' : 
                       result.status === 'warning' ? 'אזהרה' : 'נכשל'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalTests > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  כלים נוספים לבדיקת נגישות
                </h4>
                <div className="text-sm space-y-1 text-blue-700">
                  <div>• Lighthouse Accessibility Audit (Chrome DevTools)</div>
                  <div>• axe DevTools Extension</div>
                  <div>• WAVE Web Accessibility Evaluator</div>
                  <div>• Colour Contrast Analyser</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccessibilityTester;