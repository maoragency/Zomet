import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Accessibility state structure
const initialState = {
  isEnabled: false,
  highContrast: false,
  fontSize: 'normal', // 'small', 'normal', 'large', 'extra-large'
  reducedMotion: false,
  screenReaderMode: false,
  keyboardNavigation: true,
  focusVisible: true,
  announcements: true,
  autoPlay: true, // Controls auto-playing content
  textDirection: 'rtl', // 'ltr', 'rtl' - supports Hebrew interface
  colorBlindMode: false, // Color blind friendly mode
  dyslexiaMode: false, // Dyslexia friendly font
  magnifier: false, // Screen magnifier
  voiceNavigation: false, // Voice navigation
  readingGuide: false, // Reading guide/ruler
  linkHighlight: false, // Highlight all links
  imageDescriptions: true, // Show image descriptions
  tooltipMode: false, // Enhanced tooltips
  floatingButton: true, // Show floating accessibility button
  buttonPosition: { x: 20, y: 100 }, // Floating button position
  buttonSize: 'normal', // 'small', 'normal', 'large'
  buttonMinimized: false, // Is button minimized
  buttonClosed: false, // Is button temporarily closed
  buttonPermanentlyClosed: false, // Is button permanently closed until next session
};

// Action types
const ACCESSIBILITY_ACTIONS = {
  TOGGLE_ACCESSIBILITY: 'TOGGLE_ACCESSIBILITY',
  SET_HIGH_CONTRAST: 'SET_HIGH_CONTRAST',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_REDUCED_MOTION: 'SET_REDUCED_MOTION',
  SET_SCREEN_READER_MODE: 'SET_SCREEN_READER_MODE',
  SET_KEYBOARD_NAVIGATION: 'SET_KEYBOARD_NAVIGATION',
  SET_FOCUS_VISIBLE: 'SET_FOCUS_VISIBLE',
  SET_ANNOUNCEMENTS: 'SET_ANNOUNCEMENTS',
  SET_AUTO_PLAY: 'SET_AUTO_PLAY',
  SET_TEXT_DIRECTION: 'SET_TEXT_DIRECTION',
  SET_COLOR_BLIND_MODE: 'SET_COLOR_BLIND_MODE',
  SET_DYSLEXIA_MODE: 'SET_DYSLEXIA_MODE',
  SET_MAGNIFIER: 'SET_MAGNIFIER',
  SET_VOICE_NAVIGATION: 'SET_VOICE_NAVIGATION',
  SET_READING_GUIDE: 'SET_READING_GUIDE',
  SET_LINK_HIGHLIGHT: 'SET_LINK_HIGHLIGHT',
  SET_IMAGE_DESCRIPTIONS: 'SET_IMAGE_DESCRIPTIONS',
  SET_TOOLTIP_MODE: 'SET_TOOLTIP_MODE',
  SET_FLOATING_BUTTON: 'SET_FLOATING_BUTTON',
  SET_BUTTON_POSITION: 'SET_BUTTON_POSITION',
  SET_BUTTON_SIZE: 'SET_BUTTON_SIZE',
  SET_BUTTON_MINIMIZED: 'SET_BUTTON_MINIMIZED',
  SET_BUTTON_CLOSED: 'SET_BUTTON_CLOSED',
  SET_BUTTON_PERMANENTLY_CLOSED: 'SET_BUTTON_PERMANENTLY_CLOSED',
  RESET_SETTINGS: 'RESET_SETTINGS',
  LOAD_SETTINGS: 'LOAD_SETTINGS',
};

// Reducer function
function accessibilityReducer(state, action) {
  switch (action.type) {
    case ACCESSIBILITY_ACTIONS.TOGGLE_ACCESSIBILITY:
      return { ...state, isEnabled: !state.isEnabled };
    
    case ACCESSIBILITY_ACTIONS.SET_HIGH_CONTRAST:
      return { ...state, highContrast: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_FONT_SIZE:
      return { ...state, fontSize: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_REDUCED_MOTION:
      return { ...state, reducedMotion: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_SCREEN_READER_MODE:
      return { ...state, screenReaderMode: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_KEYBOARD_NAVIGATION:
      return { ...state, keyboardNavigation: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_FOCUS_VISIBLE:
      return { ...state, focusVisible: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_ANNOUNCEMENTS:
      return { ...state, announcements: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_AUTO_PLAY:
      return { ...state, autoPlay: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_TEXT_DIRECTION:
      return { ...state, textDirection: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_COLOR_BLIND_MODE:
      return { ...state, colorBlindMode: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_DYSLEXIA_MODE:
      return { ...state, dyslexiaMode: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_MAGNIFIER:
      return { ...state, magnifier: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_VOICE_NAVIGATION:
      return { ...state, voiceNavigation: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_READING_GUIDE:
      return { ...state, readingGuide: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_LINK_HIGHLIGHT:
      return { ...state, linkHighlight: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_IMAGE_DESCRIPTIONS:
      return { ...state, imageDescriptions: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_TOOLTIP_MODE:
      return { ...state, tooltipMode: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_FLOATING_BUTTON:
      return { ...state, floatingButton: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_BUTTON_POSITION:
      return { ...state, buttonPosition: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_BUTTON_SIZE:
      return { ...state, buttonSize: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_BUTTON_MINIMIZED:
      return { ...state, buttonMinimized: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_BUTTON_CLOSED:
      return { ...state, buttonClosed: action.payload };
    
    case ACCESSIBILITY_ACTIONS.SET_BUTTON_PERMANENTLY_CLOSED:
      return { ...state, buttonPermanentlyClosed: action.payload };
    
    case ACCESSIBILITY_ACTIONS.RESET_SETTINGS:
      return { ...initialState };
    
    case ACCESSIBILITY_ACTIONS.LOAD_SETTINGS:
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Create contexts
const AccessibilityContext = createContext();
const AccessibilityDispatchContext = createContext();

// Storage key for persistence
const STORAGE_KEY = 'zomet-accessibility-settings';

// Provider component
export function AccessibilityProvider({ children }) {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        dispatch({ type: ACCESSIBILITY_ACTIONS.LOAD_SETTINGS, payload: parsedSettings });
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
  }, []);

  // Save settings to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }, [state]);

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // High contrast mode - only when accessibility is enabled
    if (state.isEnabled && state.highContrast) {
      root.classList.add('accessibility-high-contrast');
    } else {
      root.classList.remove('accessibility-high-contrast');
    }

    // Font size - only apply when accessibility is enabled
    root.classList.remove('accessibility-font-small', 'accessibility-font-normal', 'accessibility-font-large', 'accessibility-font-extra-large');
    if (state.isEnabled && state.fontSize !== 'normal') {
      root.classList.add(`accessibility-font-${state.fontSize}`);
      console.log('🔤 Font size changed to:', state.fontSize, 'Applied class:', `accessibility-font-${state.fontSize}`);
    } else {
      console.log('🔤 Font size reset to browser default (accessibility disabled or normal size)');
    }

    // Reduced motion - only when accessibility is enabled
    if (state.isEnabled && state.reducedMotion) {
      root.classList.add('accessibility-reduced-motion');
    } else {
      root.classList.remove('accessibility-reduced-motion');
    }

    // Screen reader mode - only when accessibility is enabled
    if (state.isEnabled && state.screenReaderMode) {
      root.classList.add('accessibility-screen-reader');
    } else {
      root.classList.remove('accessibility-screen-reader');
    }

    // Keyboard navigation - always enabled for basic accessibility
    if (state.keyboardNavigation) {
      root.classList.add('accessibility-keyboard-nav');
    } else {
      root.classList.remove('accessibility-keyboard-nav');
    }

    // Focus visible - always enabled for basic accessibility
    if (state.focusVisible) {
      root.classList.add('accessibility-focus-visible');
    } else {
      root.classList.remove('accessibility-focus-visible');
    }

    // Auto-play control - only when accessibility is enabled
    if (state.isEnabled && !state.autoPlay) {
      root.classList.add('accessibility-no-autoplay');
    } else {
      root.classList.remove('accessibility-no-autoplay');
    }

    // Color blind mode - only when accessibility is enabled
    if (state.isEnabled && state.colorBlindMode) {
      root.classList.add('accessibility-color-blind');
    } else {
      root.classList.remove('accessibility-color-blind');
    }

    // Dyslexia mode - only when accessibility is enabled
    if (state.isEnabled && state.dyslexiaMode) {
      root.classList.add('accessibility-dyslexia');
    } else {
      root.classList.remove('accessibility-dyslexia');
    }

    // Magnifier - only when accessibility is enabled
    if (state.isEnabled && state.magnifier) {
      root.classList.add('accessibility-magnifier');
    } else {
      root.classList.remove('accessibility-magnifier');
    }

    // Voice navigation - only when accessibility is enabled
    if (state.isEnabled && state.voiceNavigation) {
      root.classList.add('accessibility-voice-nav');
    } else {
      root.classList.remove('accessibility-voice-nav');
    }

    // Reading guide - only when accessibility is enabled
    if (state.isEnabled && state.readingGuide) {
      root.classList.add('accessibility-reading-guide');
    } else {
      root.classList.remove('accessibility-reading-guide');
    }

    // Link highlight - only when accessibility is enabled
    if (state.isEnabled && state.linkHighlight) {
      root.classList.add('accessibility-link-highlight');
    } else {
      root.classList.remove('accessibility-link-highlight');
    }

    // Image descriptions - only when accessibility is enabled
    if (state.isEnabled && state.imageDescriptions) {
      root.classList.add('accessibility-image-descriptions');
    } else {
      root.classList.remove('accessibility-image-descriptions');
    }

    // Tooltip mode - only when accessibility is enabled
    if (state.isEnabled && state.tooltipMode) {
      root.classList.add('accessibility-tooltip-mode');
    } else {
      root.classList.remove('accessibility-tooltip-mode');
    }

    // Text direction
    root.setAttribute('dir', state.textDirection);
    body.setAttribute('dir', state.textDirection);

    // General accessibility mode
    if (state.isEnabled) {
      root.classList.add('accessibility-enabled');
    } else {
      root.classList.remove('accessibility-enabled');
    }

  }, [state]);

  // Detect system preferences
  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches && !state.reducedMotion) {
      dispatch({ type: ACCESSIBILITY_ACTIONS.SET_REDUCED_MOTION, payload: true });
    }

    // Detect prefers-contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (contrastQuery.matches && !state.highContrast) {
      dispatch({ type: ACCESSIBILITY_ACTIONS.SET_HIGH_CONTRAST, payload: true });
    }

    // Listen for changes
    const handleMotionChange = (e) => {
      if (e.matches) {
        dispatch({ type: ACCESSIBILITY_ACTIONS.SET_REDUCED_MOTION, payload: true });
      }
    };

    const handleContrastChange = (e) => {
      if (e.matches) {
        dispatch({ type: ACCESSIBILITY_ACTIONS.SET_HIGH_CONTRAST, payload: true });
      }
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, [state.reducedMotion, state.highContrast]);

  return (
    <AccessibilityContext.Provider value={state}>
      <AccessibilityDispatchContext.Provider value={dispatch}>
        {children}
      </AccessibilityDispatchContext.Provider>
    </AccessibilityContext.Provider>
  );
}

// Custom hooks
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

export function useAccessibilityDispatch() {
  const context = useContext(AccessibilityDispatchContext);
  if (context === undefined) {
    throw new Error('useAccessibilityDispatch must be used within an AccessibilityProvider');
  }
  return context;
}

// Action creators
export const accessibilityActions = {
  toggleAccessibility: () => ({ type: ACCESSIBILITY_ACTIONS.TOGGLE_ACCESSIBILITY }),
  setHighContrast: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_HIGH_CONTRAST, payload: enabled }),
  setFontSize: (size) => ({ type: ACCESSIBILITY_ACTIONS.SET_FONT_SIZE, payload: size }),
  setReducedMotion: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_REDUCED_MOTION, payload: enabled }),
  setScreenReaderMode: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_SCREEN_READER_MODE, payload: enabled }),
  setKeyboardNavigation: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_KEYBOARD_NAVIGATION, payload: enabled }),
  setFocusVisible: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_FOCUS_VISIBLE, payload: enabled }),
  setAnnouncements: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_ANNOUNCEMENTS, payload: enabled }),
  setAutoPlay: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_AUTO_PLAY, payload: enabled }),
  setTextDirection: (direction) => ({ type: ACCESSIBILITY_ACTIONS.SET_TEXT_DIRECTION, payload: direction }),
  setColorBlindMode: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_COLOR_BLIND_MODE, payload: enabled }),
  setDyslexiaMode: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_DYSLEXIA_MODE, payload: enabled }),
  setMagnifier: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_MAGNIFIER, payload: enabled }),
  setVoiceNavigation: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_VOICE_NAVIGATION, payload: enabled }),
  setReadingGuide: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_READING_GUIDE, payload: enabled }),
  setLinkHighlight: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_LINK_HIGHLIGHT, payload: enabled }),
  setImageDescriptions: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_IMAGE_DESCRIPTIONS, payload: enabled }),
  setTooltipMode: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_TOOLTIP_MODE, payload: enabled }),
  setFloatingButton: (enabled) => ({ type: ACCESSIBILITY_ACTIONS.SET_FLOATING_BUTTON, payload: enabled }),
  setButtonPosition: (position) => ({ type: ACCESSIBILITY_ACTIONS.SET_BUTTON_POSITION, payload: position }),
  setButtonSize: (size) => ({ type: ACCESSIBILITY_ACTIONS.SET_BUTTON_SIZE, payload: size }),
  setButtonMinimized: (minimized) => ({ type: ACCESSIBILITY_ACTIONS.SET_BUTTON_MINIMIZED, payload: minimized }),
  setButtonClosed: (closed) => ({ type: ACCESSIBILITY_ACTIONS.SET_BUTTON_CLOSED, payload: closed }),
  setButtonPermanentlyClosed: (closed) => ({ type: ACCESSIBILITY_ACTIONS.SET_BUTTON_PERMANENTLY_CLOSED, payload: closed }),
  resetSettings: () => ({ type: ACCESSIBILITY_ACTIONS.RESET_SETTINGS }),
};

export default AccessibilityContext;