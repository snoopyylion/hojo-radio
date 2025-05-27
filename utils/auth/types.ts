// Form data interfaces
export interface SignUpFormData {
  emailAddress: string;
  password: string;
}

export interface SignInFormData {
  emailAddress: string;
  password: string;
}


export interface ForgotPasswordFormData {
  emailAddress: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
  code: string;
}

export interface VerificationFormData {
  code: string;
}

// Clerk-specific interfaces
export interface ClerkSignUpData {
  emailAddress: string;
  password: string;
  unsafeMetadata: {
    firstName: string;
    lastName: string;
  };
}

export interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
  meta?: Record<string, unknown>;
}

export interface ClerkErrorResponse {
  errors: ClerkError[];
}

// Error interfaces
export interface ErrorState {
  message: string;
  code?: string;
  field?: string;
}


export interface ValidationError {
  field: string;
  message: string;
}

export interface FieldError {
  [key: string]: string;
}

// Session interfaces
export interface SessionInfo {
  sessionId: string | null;
  timestamp: string | null;
}

// OAuth interfaces
export interface OAuthCallbackParams {
  source: string;
  redirectUrl?: string;
  timestamp?: string;
}

export interface OAuthProvider {
  strategy: "oauth_google" | "oauth_apple";
  name: string;
  icon: string;
  displayName: string;
}

// Auth flow states
export type AuthFlow = 'signin' | 'signup' | 'verification' | 'forgot-password';

export interface OAuthConfig {
  redirectUrl: string;
  redirectUrlComplete: string;
}

// Animation interfaces
export interface AnimationConfig {
  duration: number;
  ease: string;
  delay?: number;
  stagger?: number;
}

export interface AnimationState {
  isAnimating: boolean;
  currentAnimation?: string;
}

export interface AnimationRefs {
  containerRef: React.RefObject<HTMLDivElement>;
  formRef: React.RefObject<HTMLDivElement>;
  imageSliderRef: React.RefObject<HTMLDivElement>;
  logoRef: React.RefObject<HTMLDivElement>;
  titleRef: React.RefObject<HTMLHeadingElement>;
  subtitleRef: React.RefObject<HTMLParagraphElement>;
  inputRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  modalRef?: React.RefObject<HTMLDivElement>;
}

// Component prop interfaces
export interface AuthLayoutProps {
  children: React.ReactNode;
  images?: string[];
  showImageSlider?: boolean;
}

export interface AuthFormProps {
  children: React.ReactNode;
  className?: string;
}

export interface OAuthButtonsProps {
  onGoogleSignUp?: () => Promise<void>;
  onAppleSignUp?: () => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onAppleSignIn?: () => Promise<void>;
  isLoading?: boolean;
  showSignUp?: boolean;
}
export type AuthErrorState = ErrorState;

export interface InputFieldProps {
  id: string;
  name: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
  ref?: React.RefObject<HTMLDivElement>;
}

export interface AuthErrorProps {
  error: ErrorState | null;
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  isLoading: boolean;
  error: ErrorState | null;
}

// Hook return types
export interface UseAuthAnimationsReturn {
  animatePageEntry: (refs: AnimationRefs) => void;
  animateModal: (element: HTMLElement, show: boolean) => void;
  animateError: (element: HTMLElement) => void;
  animateInputFocus: (element: HTMLElement) => void;
  animateInputBlur: (element: HTMLElement) => void;
  animateButtonHover: (element: HTMLElement) => void;
  animateButtonLeave: (element: HTMLElement) => void;
  animateButtonPress: (element: HTMLElement) => void;
}

export interface UseAuthRedirectReturn {
  redirectUrl: string;
  buildOAuthCallbackUrl: (source: string) => string;
  redirectToDestination: () => void;
  getRedirectUrl: () => string;
}

export interface UseFormValidationReturn {
  validateForm: (data: Record<string, any>) => ValidationError[];
  validateField: (field: string, value: any) => string | null;
  getFieldError: (field: string, generalError?: ErrorState) => string | null;
  validateEmail: (email: string) => string | null;
  validatePassword: (password: string) => string | null;
  validateRequired: (value: any, fieldName: string) => string | null;
}

export interface UseOAuthReturn {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signUpWithGoogle: () => Promise<void>;
  signUpWithApple: () => Promise<void>;
  isLoading: boolean;
  error: ErrorState | null;
}

export interface UseSignUpReturn {
  formData: SignUpFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignUpFormData>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  error: ErrorState | null;
  pendingVerification: boolean;
  setPendingVerification: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseSignInReturn {
  formData: SignInFormData;
  setFormData: React.Dispatch<React.SetStateAction<SignInFormData>>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  error: ErrorState | null;
}

export interface UseVerificationReturn {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  handleCodeChange: (index: number, value: string) => void;
  handleVerify: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isLoading: boolean;
  error: ErrorState | null;
}

// Image slider interfaces
export interface ImageSliderProps {
  images: string[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  autoSlide?: boolean;
  slideInterval?: number;
}

export interface SlideIndicatorProps {
  total: number;
  current: number;
  onSlideSelect: (index: number) => void;
}

// Form validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Authentication event types
export type AuthEventType = 
  | 'sign_up_start'
  | 'sign_up_success' 
  | 'sign_up_error'
  | 'sign_in_start'
  | 'sign_in_success'
  | 'sign_in_error'
  | 'verification_start'
  | 'verification_success'
  | 'verification_error'
  | 'oauth_start'
  | 'oauth_success'
  | 'oauth_error';

export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  data?: Record<string, unknown>;
  error?: ErrorState;
}

// Utility type helpers
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type FormFields<T> = {
  [K in keyof T]: T[K];
};
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Constants types
export interface AuthConstants {
  ANIMATION_DURATIONS: {
    PAGE_ENTRY: number;
    MODAL: number;
    INPUT_FOCUS: number;
    BUTTON_HOVER: number;
    ERROR_SHAKE: number;
  };
  VALIDATION_RULES: {
    EMAIL_REGEX: RegExp;
    PASSWORD_MIN_LENGTH: number;
    CODE_LENGTH: number;
  };
  ERROR_MESSAGES: {
    REQUIRED_FIELD: string;
    INVALID_EMAIL: string;
    PASSWORD_TOO_SHORT: string;
    GENERIC_ERROR: string;
    NETWORK_ERROR: string;
    VERIFICATION_FAILED: string;
  };
  OAUTH_CONFIG: {
    REDIRECT_URL: string;
    REDIRECT_URL_COMPLETE: string;
  };
  IMAGE_SLIDER: {
    AUTO_SLIDE_INTERVAL: number;
    IMAGES: string[];
  };
}

// Event handler types
export type InputChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => void;
export type InputFocusHandler = (e: React.FocusEvent<HTMLInputElement>) => void;
export type FormSubmitHandler = (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
export type ButtonClickHandler = (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
export type MouseEventHandler = (e: React.MouseEvent<HTMLElement>) => void;

// Verification data
export interface VerificationData {
  email: string;
  code: string;
}


// User profile data
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}