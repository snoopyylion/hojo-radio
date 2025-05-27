import { 
  DEFAULT_REDIRECTS,
  DEFAULT_REDIRECT_URL,
  OAUTH_CALLBACK_URL,
  URL_PARAMS,
  ERROR_MESSAGES, 
  STORAGE_KEYS
} from './authConstants';
import { SignUpFormData, SignInFormData } from './types';

/**
 * Builds the OAuth callback URL with proper parameters
 */
export function buildOAuthCallbackUrl(source: string, redirectUrl?: string): string {
  const oauthCallbackUrl = new URL(OAUTH_CALLBACK_URL, window.location.origin);
  
  // Only add redirect_url if it's not the default
  if (redirectUrl && redirectUrl !== DEFAULT_REDIRECT_URL) {
    oauthCallbackUrl.searchParams.set(URL_PARAMS.redirectUrl, redirectUrl);
  }
  
  // Add source parameter
  oauthCallbackUrl.searchParams.set(URL_PARAMS.source, source);
  
  // Add timestamp to prevent caching issues
  oauthCallbackUrl.searchParams.set(URL_PARAMS.timestamp, Date.now().toString());
  
  return oauthCallbackUrl.toString();
}

/**
 * Extracts redirect URL from search parameters
 */
export function getRedirectUrlFromParams(searchParams: URLSearchParams): string {
  return searchParams.get(URL_PARAMS.redirectUrl) || DEFAULT_REDIRECT_URL;
}

/**
 * Formats Clerk error messages for display
 */
export function formatClerkError(error: unknown): { message: string; code?: string } {
  if (!error) {
    return { message: ERROR_MESSAGES.unexpected_error };
  }

  // Handle Clerk error format
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const clerkError = error as { errors: Array<{ code?: string; message?: string }> };
    if (Array.isArray(clerkError.errors) && clerkError.errors.length > 0) {
      const firstError = clerkError.errors[0];
      const code = firstError.code;
      
      // Use predefined error messages if available
      if (code && code in ERROR_MESSAGES) {
        return {
          message: ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES],
          code,
        };
      }
      
      // Fall back to Clerk's error message
      return {
        message: firstError.message || ERROR_MESSAGES.unexpected_error,
        code,
      };
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return { message: error };
  }

  // Handle error objects with message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errorWithMessage = error as { message: string };
    return { message: errorWithMessage.message };
  }

  return { message: ERROR_MESSAGES.unexpected_error };
}

/**
 * Stores session information in sessionStorage
 * Note: This function uses sessionStorage which may not work in all environments
 */
export function storeSessionInfo(sessionId: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(STORAGE_KEYS.pendingSessionId, sessionId);
      sessionStorage.setItem(STORAGE_KEYS.pendingSessionTimestamp, Date.now().toString());
      console.log('📝 Stored pending session ID:', sessionId);
    }
  } catch (error) {
    console.warn('⚠️ Failed to store session info:', error);
  }
}

/**
 * Retrieves stored session information
 * Note: This function uses sessionStorage which may not work in all environments
 */
export function getStoredSessionInfo(): { sessionId: string | null; timestamp: string | null } {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return {
        sessionId: sessionStorage.getItem(STORAGE_KEYS.pendingSessionId),
        timestamp: sessionStorage.getItem(STORAGE_KEYS.pendingSessionTimestamp),
      };
    }
  } catch (error) {
    console.warn('⚠️ Failed to retrieve session info:', error);
  }
  return { sessionId: null, timestamp: null };
}

/**
 * Clears stored session information
 * Note: This function uses sessionStorage which may not work in all environments
 */
export function clearStoredSessionInfo(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(STORAGE_KEYS.pendingSessionId);
      sessionStorage.removeItem(STORAGE_KEYS.pendingSessionTimestamp);
      console.log('🧹 Cleared stored session info');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clear session info:', error);
  }
}

/**
 * Validates an email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a password meets minimum requirements
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Creates a URL with preserved query parameters
 */
export function createUrlWithParams(basePath: string, params: Record<string, string>): string {
  const url = new URL(basePath, window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  
  return url.pathname + url.search;
}

/**
 * Removes specified parameters from current URL
 */
export function removeUrlParams(paramsToRemove: string[]): void {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    
    paramsToRemove.forEach(param => {
      url.searchParams.delete(param);
    });
    
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Debounces a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Creates a delay for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validates sign up form data
 */
export function validateSignUpForm(formData: SignUpFormData, acceptedTerms: boolean): string[] {
  const errors: string[] = [];

  // Email validation
  if (!formData.emailAddress.trim()) {
    errors.push("Email address is required");
  } else if (!isValidEmail(formData.emailAddress)) {
    errors.push("Please enter a valid email address");
  }

  // Password validation
  if (!formData.password) {
    errors.push("Password is required");
  } else {
    const passwordErrors = validatePassword(formData.password);
    errors.push(...passwordErrors);
  }

  // Terms validation
  if (!acceptedTerms) {
    errors.push("You must accept the Terms of Service and Privacy Policy");
  }

  return errors;
}

/**
 * Validates sign in form data
 */
export function validateSignInForm(formData: SignInFormData): string[] {
  const errors: string[] = [];

  // Email validation
  if (!formData.emailAddress.trim()) {
    errors.push("Email address is required");
  } else if (!isValidEmail(formData.emailAddress)) {
    errors.push("Please enter a valid email address");
  }

  // Password validation
  if (!formData.password) {
    errors.push("Password is required");
  }

  return errors;
}

/**
 * Validates password strength requirements
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return errors;
}