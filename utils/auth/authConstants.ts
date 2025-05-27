// Error messages
export const ERROR_MESSAGES = {
  FORM_IDENTIFIER_NOT_FOUND: "No account found with this email address.",
  FORM_PASSWORD_INCORRECT: "Incorrect password. Please try again.",
  FORM_IDENTIFIER_EXISTS_VERIFICATION_REQUIRED: "Please check your email and verify your account before signing in.",
  TOO_MANY_REQUESTS: "Too many attempts. Please wait a moment and try again.",
  SESSION_EXISTS: "You're already signed in. Redirecting...",
  NEEDS_FIRST_FACTOR: "Additional authentication required. Please complete the sign-in process.",
  NEEDS_SECOND_FACTOR: "Two-factor authentication required. Please complete the verification.",
  NEEDS_NEW_PASSWORD: "A new password is required. Please reset your password.",
  INCOMPLETE_SIGNIN: "Sign in incomplete. Please check your credentials and try again.",
  ACTIVATION_FAILED: "Session activation failed. Please try signing in again.",
  AUTH_FAILED: "Authentication failed. Please try again.",
  GOOGLE_SIGNIN_FAILED: "Google sign-in failed. Please try again.",
  APPLE_SIGNIN_FAILED: "Apple sign-in failed. Please try again.",
  UNEXPECTED_ERROR: "An unexpected error occurred. Please try again.",
  GENERIC_AUTH_ERROR: "An authentication error occurred. Please try again.",
  unexpected_error: "An unexpected error occurred. Please try again."
} as const;

// Animation durations (in seconds)
export const ANIMATION_DURATIONS = {
  PAGE_LOAD: 0.8,
  LOGO_BOUNCE: 0.6,
  TEXT_SLIDE: 0.5,
  INPUT_SLIDE: 0.4,
  BUTTON_SLIDE: 0.4,
  ERROR_SHAKE: 0.1,
  HOVER_SCALE: 0.2,
  FOCUS_SCALE: 0.2,
  SUBMIT_BOUNCE: 0.1
} as const;

// Animation delays (in seconds)
export const ANIMATION_DELAYS = {
  INITIAL: 0.1,
  LOGO: -0.4,
  TEXT: -0.2,
  INPUTS: -0.2,
  BUTTONS: -0.2,
  ERROR_SHAKE: 0.1
} as const;

// Default redirect URLs
export const DEFAULT_REDIRECTS = {
  AFTER_SIGNIN: '/blog',
  AFTER_SIGNUP: '/blog',
  AFTER_VERIFICATION: '/blog'
} as const;

// Add the missing constants that your helper functions expect
export const DEFAULT_REDIRECT_URL = '/blog';
export const OAUTH_CALLBACK_URL = '/authentication/oauth-callback';

// URL parameters
export const URL_PARAMS = {
  redirectUrl: 'redirect_url',
  source: 'source',
  timestamp: 'timestamp'
} as const;

// Session storage keys
export const STORAGE_KEYS = {
  PENDING_SESSION_ID: 'pendingSessionId',
  PENDING_SESSION_TIMESTAMP: 'pendingSessionTimestamp',
  pendingSessionId: 'pendingSessionId',
  pendingSessionTimestamp: 'pendingSessionTimestamp'
} as const;

// OAuth callback sources
export const OAUTH_SOURCES = {
  GOOGLE: 'oauth-google',
  APPLE: 'oauth-apple',
  EMAIL_SIGNIN: 'email-signin',
  EXISTING_SESSION: 'existing-session'
} as const;

// Image slider configuration
export const SLIDER_CONFIG = {
  AUTO_SLIDE_INTERVAL: 4000, // 4 seconds
  TRANSITION_DURATION: 500, // 0.5 seconds
  IMAGES: [
    "/img/login1.png",
    "/img/login2.png",
    "/img/login3.png"
  ]
} as const;

// Form validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px'
} as const;

// Component sizes
export const COMPONENT_SIZES = {
  INPUT_HEIGHT: {
    SM: '2.5rem', // h-10
    MD: '2.75rem' // h-11
  },
  BUTTON_HEIGHT: {
    SM: '2.75rem', // h-11
    MD: '3rem' // h-12
  },
  LOGO_SIZE: {
    WIDTH: 100,
    HEIGHT: 100
  }
} as const;