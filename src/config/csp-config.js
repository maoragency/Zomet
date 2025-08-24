/**
 * Content Security Policy Configuration
 */

export const CSP_CONFIG = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://cdn.jsdelivr.net",
    "https://unpkg.com"
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com"
  ],
  "font-src": [
    "'self'",
    "https://fonts.gstatic.com",
    "data:"
  ],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "https://images.unsplash.com",
    "https://via.placeholder.com"
  ],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.supabase.io"
  ],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "upgrade-insecure-requests": []
};

export const CSP_HEADER = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: https://images.unsplash.com https://via.placeholder.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.supabase.io; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /api/csp-report";

export const CSP_META_TAG = `<meta http-equiv="Content-Security-Policy" content="${CSP_HEADER}">`;

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
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');

  return directives + `; report-uri ${CSP_CONFIG.reportEndpoint || '/api/csp-report'}`;
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
      issues.push(`Missing essential directive: ${directive}`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}