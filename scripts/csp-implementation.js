#!/usr/bin/env node

/**
 * Content Security Policy Implementation Script
 * Implements CSP headers and violation tracking for the Tzomet project
 */

import fs from 'fs/promises';
import path from 'path';

class CSPImplementer {
  constructor() {
    this.cspConfig = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite dev mode
        "'unsafe-eval'", // Required for Vite dev mode
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and Tailwind
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        'https://images.unsplash.com',
        'https://via.placeholder.com'
      ],
      'connect-src': [
        "'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://api.supabase.io'
      ],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    };

    this.violations = [];
    this.reportEndpoint = '/api/csp-report';
  }

  /**
   * Generate CSP header string
   */
  generateCSPHeader() {
    const directives = Object.entries(this.cspConfig)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');

    return directives + `; report-uri ${this.reportEndpoint}`;
  }

  /**
   * Generate CSP meta tag for HTML
   */
  generateCSPMetaTag() {
    const cspHeader = this.generateCSPHeader();
    return `<meta http-equiv="Content-Security-Policy" content="${cspHeader}">`;
  }

  /**
   * Create CSP violation tracking middleware
   */
  createViolationTracker() {
    return `
// CSP Violation Tracker
class CSPViolationTracker {
  constructor() {
    this.violations = [];
    this.setupViolationListener();
  }

  setupViolationListener() {
    document.addEventListener('securitypolicyviolation', (event) => {
      const violation = {
        timestamp: new Date().toISOString(),
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        effectiveDirective: event.effectiveDirective,
        originalPolicy: event.originalPolicy,
        referrer: event.referrer,
        statusCode: event.statusCode,
        violatedDirective: event.violatedDirective,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber,
        sourceFile: event.sourceFile,
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId()
      };

      this.logViolation(violation);
      this.reportViolation(violation);
    });
  }

  logViolation(violation) {
    console.warn('CSP Violation:', violation);
    this.violations.push(violation);
    
    // Store in localStorage for debugging
    const storedViolations = JSON.parse(localStorage.getItem('csp-violations') || '[]');
    storedViolations.push(violation);
    localStorage.setItem('csp-violations', JSON.stringify(storedViolations.slice(-100))); // Keep last 100
  }

  async reportViolation(violation) {
    try {
      await fetch('/api/csp-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(violation)
      });
    } catch (error) {
      console.error('Failed to report CSP violation:', error);
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('session-id');
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('session-id', sessionId);
    }
    return sessionId;
  }

  getViolations() {
    return this.violations;
  }

  clearViolations() {
    this.violations = [];
    localStorage.removeItem('csp-violations');
  }
}

// Initialize CSP violation tracker
window.cspTracker = new CSPViolationTracker();
`;
  }

  /**
   * Update index.html with CSP meta tag
   */
  async updateIndexHTML() {
    try {
      const indexPath = path.join(process.cwd(), 'index.html');
      let content = await fs.readFile(indexPath, 'utf-8');
      
      const cspMetaTag = this.generateCSPMetaTag();
      
      // Remove existing CSP meta tag if present
      content = content.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '');
      
      // Add CSP meta tag after charset
      content = content.replace(
        /<meta charset="utf-8">/,
        `<meta charset="utf-8">\n    ${cspMetaTag}`
      );
      
      await fs.writeFile(indexPath, content);
      console.log('✅ Updated index.html with CSP meta tag');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to update index.html:', error.message);
      return false;
    }
  }

  /**
   * Create CSP violation tracking component
   */
  async createViolationComponent() {
    const componentPath = path.join(process.cwd(), 'src/components/security/CSPViolationTracker.jsx');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(componentPath), { recursive: true });
    
    const componentContent = `import { useEffect, useState } from 'react';

/**
 * CSP Violation Tracker Component
 * Displays CSP violations for debugging purposes (development only)
 */
export default function CSPViolationTracker() {
  const [violations, setViolations] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.MODE !== 'development') return;

    const updateViolations = () => {
      if (window.cspTracker) {
        setViolations(window.cspTracker.getViolations());
      }
    };

    // Update violations every 5 seconds
    const interval = setInterval(updateViolations, 5000);
    updateViolations();

    return () => clearInterval(interval);
  }, []);

  if (import.meta.env.MODE !== 'development' || violations.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-red-600 transition-colors"
      >
        CSP Violations ({violations.length})
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-y-auto bg-white border border-red-300 rounded-lg shadow-xl">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <h3 className="font-semibold text-red-800">CSP Violations</h3>
            <button
              onClick={() => {
                window.cspTracker?.clearViolations();
                setViolations([]);
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {violations.map((violation, index) => (
              <div key={index} className="p-3 border-b border-gray-200 text-sm">
                <div className="font-medium text-red-700">
                  {violation.violatedDirective}
                </div>
                <div className="text-gray-600 mt-1">
                  Blocked: {violation.blockedURI}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {new Date(violation.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}`;

    await fs.writeFile(componentPath, componentContent);
    console.log('✅ Created CSP violation tracker component');
  }

  /**
   * Create CSP violation tracking script
   */
  async createViolationScript() {
    const scriptPath = path.join(process.cwd(), 'public/csp-tracker.js');
    const scriptContent = this.createViolationTracker();
    
    await fs.writeFile(scriptPath, scriptContent);
    console.log('✅ Created CSP violation tracking script');
  }

  /**
   * Generate CSP configuration file
   */
  async generateConfigFile() {
    const configPath = path.join(process.cwd(), 'src/config/csp-config.js');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    const configContent = `/**
 * Content Security Policy Configuration
 */

export const CSP_CONFIG = ${JSON.stringify(this.cspConfig, null, 2)};

export const CSP_HEADER = "${this.generateCSPHeader()}";

export const CSP_META_TAG = \`${this.generateCSPMetaTag()}\`;

/**
 * Get CSP header for different environments
 */
export function getCSPHeader(env = 'production') {
  const config = { ...CSP_CONFIG };
  
  if (env === 'development') {
    // Relax CSP for development
    config['script-src'].push("'unsafe-eval'", "'unsafe-inline'");
    config['style-src'].push("'unsafe-inline'");
  }
  
  const directives = Object.entries(config)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return \`\${directive} \${sources.join(' ')}\`;
    })
    .join('; ');

  return directives + \`; report-uri \${CSP_CONFIG.reportEndpoint || '/api/csp-report'}\`;
}

/**
 * Validate CSP configuration
 */
export function validateCSPConfig() {
  const issues = [];
  
  // Check for unsafe directives in production
  if (process.env.NODE_ENV === 'production') {
    if (CSP_CONFIG['script-src'].includes("'unsafe-eval'")) {
      issues.push("'unsafe-eval' should not be used in production");
    }
    if (CSP_CONFIG['script-src'].includes("'unsafe-inline'")) {
      issues.push("'unsafe-inline' for scripts should be avoided in production");
    }
  }
  
  // Check for missing essential directives
  const essentialDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
  for (const directive of essentialDirectives) {
    if (!CSP_CONFIG[directive]) {
      issues.push(\`Missing essential directive: \${directive}\`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}`;

    await fs.writeFile(configPath, configContent);
    console.log('✅ Created CSP configuration file');
  }

  /**
   * Run complete CSP implementation
   */
  async implement() {
    console.log('🔒 Implementing Content Security Policy...\n');
    
    try {
      await this.updateIndexHTML();
      await this.createViolationComponent();
      await this.createViolationScript();
      await this.generateConfigFile();
      
      console.log('\n✅ CSP Implementation completed successfully!');
      console.log('\nCSP Header:', this.generateCSPHeader());
      
      return {
        success: true,
        cspHeader: this.generateCSPHeader(),
        files: [
          'index.html (updated)',
          'src/components/security/CSPViolationTracker.jsx',
          'public/csp-tracker.js',
          'src/config/csp-config.js'
        ]
      };
    } catch (error) {
      console.error('❌ CSP Implementation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const implementer = new CSPImplementer();
  implementer.implement();
}

export default CSPImplementer;