/**
 * Supabase Helper Functions
 * 
 * Utility functions to safely handle Supabase responses and prevent destructuring errors
 */

/**
 * Safely handle Supabase response with proper error checking
 * @param {Promise} supabasePromise - The Supabase promise to handle
 * @param {string} operation - Description of the operation for error messages
 * @returns {Promise<{data, error}>} - Safe response object
 */
export async function safeSupabaseCall(supabasePromise, operation = 'database operation') {
  try {
    const response = await supabasePromise;
    
    if (!response) {
      return {
        data: null,
        error: new Error(`תגובה לא תקינה מהשרת עבור ${operation}`)
      };
    }
    
    // Ensure response has the expected structure
    const { data = null, error = null } = response;
    
    return { data, error };
  } catch (err) {
    console.error(`Error in ${operation}:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(`שגיאה לא צפויה ב-${operation}`)
    };
  }
}

/**
 * Safely handle Supabase auth response
 * @param {Promise} authPromise - The Supabase auth promise to handle
 * @param {string} operation - Description of the operation for error messages
 * @returns {Promise<{data, error}>} - Safe response object
 */
export async function safeAuthCall(authPromise, operation = 'authentication operation') {
  try {
    const response = await authPromise;
    
    if (!response) {
      return {
        data: null,
        error: new Error(`תגובה לא תקינה מהשרת עבור ${operation}`)
      };
    }
    
    // Handle auth-specific response structure
    const { data = null, error = null, user = null, session = null } = response;
    
    return { 
      data: data || { user, session }, 
      error,
      user,
      session
    };
  } catch (err) {
    console.error(`Error in ${operation}:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(`שגיאה לא צפויה ב-${operation}`),
      user: null,
      session: null
    };
  }
}

/**
 * Safely handle Supabase storage response
 * @param {Promise} storagePromise - The Supabase storage promise to handle
 * @param {string} operation - Description of the operation for error messages
 * @returns {Promise<{data, error}>} - Safe response object
 */
export async function safeStorageCall(storagePromise, operation = 'storage operation') {
  try {
    const response = await storagePromise;
    
    if (!response) {
      return {
        data: null,
        error: new Error(`תגובה לא תקינה מהשרת עבור ${operation}`)
      };
    }
    
    const { data = null, error = null } = response;
    
    return { data, error };
  } catch (err) {
    console.error(`Error in ${operation}:`, err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(`שגיאה לא צפויה ב-${operation}`)
    };
  }
}

/**
 * Check if a value is a valid Supabase response
 * @param {any} response - The response to check
 * @returns {boolean} - Whether the response is valid
 */
export function isValidSupabaseResponse(response) {
  return response && typeof response === 'object' && ('data' in response || 'error' in response);
}

/**
 * Extract error message from Supabase error
 * @param {any} error - The error object
 * @returns {string} - Human-readable error message in Hebrew
 */
export function getSupabaseErrorMessage(error) {
  if (!error) return 'שגיאה לא ידועה';
  
  if (typeof error === 'string') return error;
  
  if (error.message) {
    // Common Supabase error translations
    const errorTranslations = {
      'Invalid login credentials': 'פרטי התחברות שגויים',
      'User already registered': 'המשתמש כבר רשום במערכת',
      'Email not confirmed': 'האימייל לא אומת',
      'Password should be at least 6 characters': 'הסיסמה חייבת להכיל לפחות 6 תווים',
      'Unable to validate email address': 'לא ניתן לאמת את כתובת האימייל',
      'Network request failed': 'בעיית רשת - נסה שוב מאוחר יותר',
      'Row Level Security policy violation': 'אין הרשאה לבצע פעולה זו'
    };
    
    return errorTranslations[error.message] || error.message;
  }
  
  return 'שגיאה לא ידועה';
}