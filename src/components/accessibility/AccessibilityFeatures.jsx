import React, { useEffect, useState, useRef } from 'react';
import { useAccessibility, useAccessibilityDispatch, accessibilityActions } from '@/contexts/AccessibilityContext';
import { Button } from '@/components/ui/button';
import { Accessibility } from 'lucide-react';
import AccessibilityShortcuts from './AccessibilityShortcuts';
import FloatingAccessibilityButton from './FloatingAccessibilityButton';

// Screen Magnifier Component
export function ScreenMagnifier() {
  const { magnifier } = useAccessibility();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lensRef = useRef(null);

  useEffect(() => {
    if (!magnifier) return;

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [magnifier]);

  if (!magnifier) return null;

  return (
    <div
      ref={lensRef}
      className="accessibility-magnifier-lens"
      style={{
        left: position.x - 100,
        top: position.y - 100,
      }}
    />
  );
}

// Reading Guide Component
export function ReadingGuide() {
  const { readingGuide } = useAccessibility();
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!readingGuide) return;

    const handleMouseMove = (e) => {
      setPosition(e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [readingGuide]);

  if (!readingGuide) return null;

  return (
    <>
      <div
        className="accessibility-reading-guide-highlight"
        style={{ top: position - 20 }}
      />
      <div
        className="accessibility-reading-guide-ruler"
        style={{ top: position }}
      />
    </>
  );
}

// Voice Navigation Component
export function VoiceNavigation() {
  const { voiceNavigation } = useAccessibility();
  const [isListening, setIsListening] = useState(false);
  const [command, setCommand] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!voiceNavigation || !('webkitSpeechRecognition' in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'he-IL';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setCommand(transcript);
      
      // Process voice commands
      processVoiceCommand(transcript.toLowerCase());
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [voiceNavigation]);

  const processVoiceCommand = (command) => {
    if (command.includes('דף הבית') || command.includes('בית')) {
      window.location.href = '/';
    } else if (command.includes('פרסם מודעה') || command.includes('הוסף רכב')) {
      window.location.href = '/addvehicle';
    } else if (command.includes('התחבר') || command.includes('כניסה')) {
      window.location.href = '/login';
    } else if (command.includes('גלול למעלה')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (command.includes('גלול למטה')) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  if (!voiceNavigation) return null;

  return (
    <div className={`voice-command-indicator ${isListening ? 'voice-listening' : ''}`}>
      {isListening ? '🎤 מאזין...' : '🎤 לא פעיל'}
      {command && <div style={{ fontSize: '12px', marginTop: '4px' }}>{command}</div>}
    </div>
  );
}

// Accessibility Status Indicator
export function AccessibilityStatusIndicator() {
  const accessibility = useAccessibility();
  const [activeFeatures, setActiveFeatures] = useState([]);

  useEffect(() => {
    const features = [];
    if (accessibility.highContrast) features.push('ניגודיות גבוהה');
    if (accessibility.fontSize !== 'normal') features.push('גופן מותאם');
    if (accessibility.reducedMotion) features.push('אנימציות מופחתות');
    if (accessibility.screenReaderMode) features.push('קורא מסך');
    if (accessibility.colorBlindMode) features.push('מצב עיוורון צבעים');
    if (accessibility.dyslexiaMode) features.push('מצב דיסלקציה');
    if (accessibility.magnifier) features.push('זכוכית מגדלת');
    if (accessibility.voiceNavigation) features.push('ניווט קולי');
    if (accessibility.readingGuide) features.push('מדריך קריאה');
    if (accessibility.linkHighlight) features.push('הדגשת קישורים');
    
    setActiveFeatures(features);
  }, [accessibility]);

  if (!accessibility.isEnabled || activeFeatures.length === 0) return null;

  return (
    <div className="accessibility-status-indicator">
      נגישות פעילה: {activeFeatures.length} תכונות
    </div>
  );
}

// Accessibility Announcements
export function AccessibilityAnnouncements() {
  const { announcements } = useAccessibility();
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  useEffect(() => {
    if (!announcements) return;

    const handleAnnouncement = (event) => {
      setCurrentAnnouncement(event.detail.message);
      setShowAnnouncement(true);
      
      setTimeout(() => {
        setShowAnnouncement(false);
      }, 3000);
    };

    document.addEventListener('accessibility-announce', handleAnnouncement);
    return () => document.removeEventListener('accessibility-announce', handleAnnouncement);
  }, [announcements]);

  if (!showAnnouncement || !currentAnnouncement) return null;

  return (
    <div className="accessibility-announcement" role="status" aria-live="polite">
      {currentAnnouncement}
    </div>
  );
}

// Temporary Show Button (for when button is temporarily closed)
export function TemporaryShowButton() {
  const { buttonClosed, floatingButton } = useAccessibility();
  const dispatch = useAccessibilityDispatch();

  if (!buttonClosed || !floatingButton) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9998]">
      <Button
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-blue-50 to-amber-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-lg temporary-show-button"
        onClick={() => dispatch(accessibilityActions.setButtonClosed(false))}
        aria-label="הצג כפתור נגישות"
        title="הצג מחדש את כפתור הנגישות"
      >
        <Accessibility className="w-4 h-4 ml-1" />
        נגישות
      </Button>
    </div>
  );
}

// Emergency Show Button (for when button is permanently closed)
export function EmergencyShowButton() {
  const { buttonPermanentlyClosed, floatingButton } = useAccessibility();
  const dispatch = useAccessibilityDispatch();

  // Only show if button is permanently closed
  if (!buttonPermanentlyClosed || !floatingButton) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9998]">
      <Button
        variant="outline"
        size="sm"
        className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 text-red-700 hover:bg-red-100 shadow-lg"
        onClick={() => {
          dispatch(accessibilityActions.setButtonPermanentlyClosed(false));
          dispatch(accessibilityActions.setButtonClosed(false));
        }}
        aria-label="שחזר כפתור נגישות"
        title="שחזר כפתור נגישות (נסגר לצמיתות)"
      >
        <Accessibility className="w-4 h-4 ml-1" />
        שחזר נגישות
      </Button>
    </div>
  );
}

// Main Accessibility Features Container
export default function AccessibilityFeatures() {
  const accessibility = useAccessibility();
  const { floatingButton, buttonPermanentlyClosed, buttonClosed } = accessibility;
  const dispatch = useAccessibilityDispatch();
  
  // Show floating button if enabled and not permanently closed
  const showFloatingButton = floatingButton && !buttonPermanentlyClosed && !buttonClosed;
  
  // Debug logging
  console.log('AccessibilityFeatures Debug:', {
    floatingButton,
    buttonPermanentlyClosed,
    buttonClosed,
    showFloatingButton,
    fullAccessibilityState: accessibility
  });

  // Add global reset function for debugging
  useEffect(() => {
    window.resetAccessibilityButton = () => {
      console.log('🔄 Resetting accessibility button...');
      dispatch(accessibilityActions.setButtonPermanentlyClosed(false));
      dispatch(accessibilityActions.setButtonClosed(false));
      dispatch(accessibilityActions.setButtonMinimized(false));
      dispatch(accessibilityActions.setFloatingButton(true));
      localStorage.removeItem('zomet-accessibility-settings');
      localStorage.removeItem('zomet-floating-accessibility-settings');
      console.log('✅ Accessibility button reset complete!');
    };
    
    // Add admin role fix function
    window.fixAdminRole = async () => {
      console.log('🔧 Fixing admin role for zometauto@gmail.com...');
      try {
        const response = await fetch('/api/fix-admin-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'zometauto@gmail.com' })
        });
        const result = await response.json();
        console.log('✅ Admin role fix result:', result);
      } catch (error) {
        console.error('❌ Admin role fix failed:', error);
      }
    };
    
    // Add user status check function
    window.checkUserStatus = () => {
      console.log('👤 Current user status:');
      const authData = JSON.parse(localStorage.getItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token') || '{}');
      console.log('  - Auth token:', authData);
      console.log('  - User email:', authData.user?.email);
      console.log('  - User role:', authData.user?.user_metadata?.role);
    };
    
    console.log('🔧 Debug functions available:');
    console.log('  - resetAccessibilityButton() - Reset accessibility button');
    console.log('  - fixAdminRole() - Fix admin role for zometauto@gmail.com');
    console.log('  - checkUserStatus() - Check current user status');
  }, [dispatch]);
  
  return (
    <>
      <AccessibilityShortcuts />
      <ScreenMagnifier />
      <ReadingGuide />
      <VoiceNavigation />
      <AccessibilityStatusIndicator />
      <AccessibilityAnnouncements />
      {showFloatingButton && <FloatingAccessibilityButton />}
      <TemporaryShowButton />
      <EmergencyShowButton />
    </>
  );
}