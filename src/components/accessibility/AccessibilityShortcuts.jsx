import React, { useEffect } from 'react';
import { useAccessibility, useAccessibilityDispatch, accessibilityActions } from '@/contexts/AccessibilityContext';
import { announceToScreenReader, setAccessibleFocus } from '@/utils/accessibility';

export function AccessibilityShortcuts() {
  const accessibility = useAccessibility();
  const dispatch = useAccessibilityDispatch();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when accessibility is enabled
      if (!accessibility.isEnabled) return;

      // Ctrl + Plus: Increase font size
      if (e.ctrlKey && e.key === '+') {
        e.preventDefault();
        const sizes = ['small', 'normal', 'large', 'extra-large'];
        const currentIndex = sizes.indexOf(accessibility.fontSize);
        const nextIndex = Math.min(currentIndex + 1, sizes.length - 1);
        dispatch(accessibilityActions.setFontSize(sizes[nextIndex]));
        announceToScreenReader(`גודל גופן שונה ל${sizes[nextIndex] === 'small' ? 'קטן' : sizes[nextIndex] === 'normal' ? 'רגיל' : sizes[nextIndex] === 'large' ? 'גדול' : 'גדול מאוד'}`);
      }

      // Ctrl + Minus: Decrease font size
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        const sizes = ['small', 'normal', 'large', 'extra-large'];
        const currentIndex = sizes.indexOf(accessibility.fontSize);
        const nextIndex = Math.max(currentIndex - 1, 0);
        dispatch(accessibilityActions.setFontSize(sizes[nextIndex]));
        announceToScreenReader(`גודל גופן שונה ל${sizes[nextIndex] === 'small' ? 'קטן' : sizes[nextIndex] === 'normal' ? 'רגיל' : sizes[nextIndex] === 'large' ? 'גדול' : 'גדול מאוד'}`);
      }

      // Ctrl + Alt + C: Toggle high contrast
      if (e.ctrlKey && e.altKey && e.key === 'c') {
        e.preventDefault();
        dispatch(accessibilityActions.setHighContrast(!accessibility.highContrast));
        announceToScreenReader(`ניגודיות גבוהה ${!accessibility.highContrast ? 'הופעלה' : 'בוטלה'}`);
      }

      // Ctrl + Alt + M: Toggle reduced motion
      if (e.ctrlKey && e.altKey && e.key === 'm') {
        e.preventDefault();
        dispatch(accessibilityActions.setReducedMotion(!accessibility.reducedMotion));
        announceToScreenReader(`הפחתת אנימציות ${!accessibility.reducedMotion ? 'הופעלה' : 'בוטלה'}`);
      }

      // Ctrl + Alt + R: Toggle reading guide
      if (e.ctrlKey && e.altKey && e.key === 'r') {
        e.preventDefault();
        dispatch(accessibilityActions.setReadingGuide(!accessibility.readingGuide));
        announceToScreenReader(`מדריך קריאה ${!accessibility.readingGuide ? 'הופעל' : 'בוטל'}`);
      }

      // Ctrl + Alt + L: Toggle link highlight
      if (e.ctrlKey && e.altKey && e.key === 'l') {
        e.preventDefault();
        dispatch(accessibilityActions.setLinkHighlight(!accessibility.linkHighlight));
        announceToScreenReader(`הדגשת קישורים ${!accessibility.linkHighlight ? 'הופעלה' : 'בוטלה'}`);
      }

      // Ctrl + Alt + Z: Toggle magnifier
      if (e.ctrlKey && e.altKey && e.key === 'z') {
        e.preventDefault();
        dispatch(accessibilityActions.setMagnifier(!accessibility.magnifier));
        announceToScreenReader(`זכוכית מגדלת ${!accessibility.magnifier ? 'הופעלה' : 'בוטלה'}`);
      }

      // F1: Show accessibility help
      if (e.key === 'F1') {
        e.preventDefault();
        showAccessibilityHelp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [accessibility, dispatch]);

  const showAccessibilityHelp = () => {
    const helpText = `
קיצורי מקלדת לנגישות:
Alt + A: פתח תפריט נגישות
Alt + H: עבור לתוכן הראשי
Alt + N: עבור לניווט
Ctrl + Plus: הגדל גופן
Ctrl + Minus: הקטן גופן
Ctrl + Alt + C: ניגודיות גבוהה
Ctrl + Alt + M: הפחת אנימציות
Ctrl + Alt + R: מדריך קריאה
Ctrl + Alt + L: הדגש קישורים
Ctrl + Alt + Z: זכוכית מגדלת
F1: עזרה זו
    `;
    
    announceToScreenReader(helpText);
    
    // Also show visual help
    const helpDialog = document.createElement('div');
    helpDialog.className = 'accessibility-help-dialog';
    helpDialog.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        direction: rtl;
        text-align: right;
      ">
        <h3 style="margin-top: 0; color: #1e40af;">קיצורי מקלדת לנגישות</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.5;">${helpText}</pre>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #1e40af;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        ">סגור</button>
      </div>
    `;
    
    document.body.appendChild(helpDialog);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (helpDialog.parentElement) {
        helpDialog.remove();
      }
    }, 10000);
  };

  return null; // This component doesn't render anything
}

export default AccessibilityShortcuts;