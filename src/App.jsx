import './App.css'
import './styles/navigation-fixes.css'
import './styles/accessibility.css'
import './styles/advanced-accessibility.css'
import './styles/dashboard-minimal.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/useAuth"
import { AccessibilityProvider } from "@/contexts/AccessibilityContext"
import NavigationDebugger from "@/components/debug/NavigationDebugger"
import ErrorBoundary from "@/components/ErrorBoundary"
import SkipLinks from "@/components/accessibility/SkipLinks"
import AccessibilityFeatures from "@/components/accessibility/AccessibilityFeatures"
import { initializeAccessibility } from "@/utils/accessibility"
import { useEffect } from 'react'

function App() {
  useEffect(() => {
    initializeAccessibility();
  }, []);

  return (
    <ErrorBoundary context="App">
      <AccessibilityProvider>
        <AuthProvider>
          <SkipLinks />
          <AccessibilityFeatures />
          <ErrorBoundary context="Navigation">
            <Pages />
          </ErrorBoundary>
          <Toaster />
        </AuthProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  )
}

export default App 