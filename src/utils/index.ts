


/**
 * Navigation utilities for consistent routing across the application
 */

// Define all valid routes in the application
export const ROUTES = {
  // Public routes
  HOME: '/',
  ADD_VEHICLE: '/addvehicle',
  VEHICLE_DETAILS: '/vehicledetails',
  PRICING: '/pricing',
  BUYER_REQUEST: '/buyerrequest',
  FINANCING_AND_INSURANCE: '/financingandinsurance',
  FINANCING: '/financing',
  INSURANCE: '/insurance',
  MY_LISTINGS: '/mylistings',
  VEHICLE_PRICING: '/vehiclepricing',
  CHECKOUT: '/checkout',
  PAYMENT_SUCCESS: '/paymentsuccess',
  CONTACT: '/contact',
  
  // Auth routes
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgotpassword',
  RESET_PASSWORD: '/resetpassword',
  
  // Dashboard routes
  DASHBOARD: '/dashboard',
  DASHBOARD_PROFILE: '/dashboard/profile',
  DASHBOARD_ACTIVITY: '/dashboard/activity',
  DASHBOARD_ADS: '/dashboard/ads',
  DASHBOARD_MESSAGES: '/dashboard/messages',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_USERS: '/admin/users',
  ADMIN_VEHICLES: '/admin/vehicles',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_SYSTEM: '/admin/system',
  ADMIN_AUDIT: '/admin/audit'
} as const;

// Route name to path mapping for backward compatibility
const ROUTE_MAPPING: Record<string, string> = {
  'Home': ROUTES.HOME,
  'AddVehicle': ROUTES.ADD_VEHICLE,
  'VehicleDetails': ROUTES.VEHICLE_DETAILS,
  'Pricing': ROUTES.PRICING,
  'BuyerRequest': ROUTES.BUYER_REQUEST,
  'FinancingAndInsurance': ROUTES.FINANCING_AND_INSURANCE,
  'Financing': ROUTES.FINANCING,
  'Insurance': ROUTES.INSURANCE,
  'MyListings': ROUTES.MY_LISTINGS,
  'VehiclePricing': ROUTES.VEHICLE_PRICING,
  'Checkout': ROUTES.CHECKOUT,
  'PaymentSuccess': ROUTES.PAYMENT_SUCCESS,
  'Contact': ROUTES.CONTACT,
  'Login': ROUTES.LOGIN,
  'Signup': ROUTES.SIGNUP,
  'ForgotPassword': ROUTES.FORGOT_PASSWORD,
  'ResetPassword': ROUTES.RESET_PASSWORD
};

/**
 * Create a page URL with proper validation and error handling
 * @param pageName - Page name or route path
 * @param params - Optional query parameters
 * @returns Valid route path
 */
export function createPageUrl(pageName: string, params?: Record<string, string | number>): string {
  // Handle direct route paths
  if (pageName.startsWith('/')) {
    const baseUrl = pageName;
    return params ? `${baseUrl}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : baseUrl;
  }
  
  // Handle named routes
  const route = ROUTE_MAPPING[pageName];
  if (route) {
    return params ? `${route}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : route;
  }
  
  // Fallback to legacy behavior with improved handling
  const normalizedName = pageName.toLowerCase().replace(/\s+/g, '');
  const fallbackRoute = `/${normalizedName}`;
  
  console.warn(`Route not found for "${pageName}", using fallback: ${fallbackRoute}`);
  return params ? `${fallbackRoute}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}` : fallbackRoute;
}

/**
 * Get route by name with validation
 * @param routeName - Route name
 * @returns Route path or null if not found
 */
export function getRoute(routeName: keyof typeof ROUTES): string {
  return ROUTES[routeName];
}

/**
 * Check if a route is valid
 * @param path - Route path to validate
 * @returns True if route is valid
 */
export function isValidRoute(path: string): boolean {
  const normalizedPath = path.split('?')[0]; // Remove query params
  return Object.values(ROUTES).includes(normalizedPath as any) || 
         normalizedPath.startsWith('/dashboard/') || 
         normalizedPath.startsWith('/admin/');
}

/**
 * Navigate with error handling and validation
 * @param navigate - React Router navigate function
 * @param path - Path to navigate to
 * @param options - Navigation options
 */
export function safeNavigate(
  navigate: (path: string, options?: any) => void, 
  path: string, 
  options?: { replace?: boolean; state?: any }
): void {
  try {
    if (!isValidRoute(path)) {
      console.warn(`Attempting to navigate to invalid route: ${path}`);
      // Fallback to home page
      navigate(ROUTES.HOME, options);
      return;
    }
    
    navigate(path, options);
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to home page on error
    navigate(ROUTES.HOME, { replace: true });
  }
}

/**
 * Image utilities for handling Supabase Storage URLs and fallbacks
 */

// Default fallback image for vehicles
export const DEFAULT_VEHICLE_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80';

/**
 * Get optimized image URL with fallback
 * @param imageUrl - Original image URL
 * @param options - Optimization options
 * @returns Optimized image URL or fallback
 */
export function getOptimizedImageUrl(imageUrl: string | null | undefined, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
} = {}): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return DEFAULT_VEHICLE_IMAGE;
  }

  // If it's already a Supabase Storage URL, return as is (optimization is handled during upload)
  if (imageUrl.includes('supabase') || imageUrl.includes('storage')) {
    return imageUrl;
  }

  // If it's an external URL (like Unsplash), add optimization parameters
  if (imageUrl.includes('unsplash.com')) {
    const url = new URL(imageUrl);
    if (options.width) url.searchParams.set('w', options.width.toString());
    if (options.height) url.searchParams.set('h', options.height.toString());
    if (options.quality) url.searchParams.set('q', options.quality.toString());
    if (options.format) url.searchParams.set('fm', options.format);
    return url.toString();
  }

  return imageUrl;
}

/**
 * Get vehicle image with fallback
 * @param vehicle - Vehicle object
 * @param index - Image index (default: 0 for main image)
 * @param options - Optimization options
 * @returns Image URL or fallback
 */
export function getVehicleImageUrl(vehicle: any, index: number = 0, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
} = {}): string {
  if (!vehicle?.images || !Array.isArray(vehicle.images) || vehicle.images.length === 0) {
    return getOptimizedImageUrl(null, options);
  }

  const imageUrl = vehicle.images[index];
  return getOptimizedImageUrl(imageUrl, options);
}

/**
 * Validate image URL
 * @param url - Image URL to validate
 * @returns Promise that resolves to true if image is valid
 */
export function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Preload images for better performance
 * @param urls - Array of image URLs to preload
 * @returns Promise that resolves when all images are loaded or failed
 */
export function preloadImages(urls: string[]): Promise<void> {
  return new Promise((resolve) => {
    let loadedCount = 0;
    const totalCount = urls.length;

    if (totalCount === 0) {
      resolve();
      return;
    }

    urls.forEach((url) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalCount) {
          resolve();
        }
      };
      img.src = url;
    });
  });
}