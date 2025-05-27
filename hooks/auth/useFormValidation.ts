import { useState, useCallback } from "react";

interface FormData {
  emailAddress: string;
  password: string;
}

interface ErrorState {
  message: string;
  code?: string;
}

interface ClerkError {
  code: string;
  message: string;
  longMessage?: string;
  meta?: Record<string, unknown>;
}

export function useFormValidation() {
  const [formData, setFormData] = useState<FormData>({
    emailAddress: "",
    password: "",
  });
  const [errors, setErrors] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors(null);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // ADD: validateForm function
  const validateForm = useCallback(() => {
    if (!formData.emailAddress) {
      setErrors({ message: "Email address is required" });
      return false;
    }
    if (!formData.password) {
      setErrors({ message: "Password is required" });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.emailAddress)) {
      setErrors({ message: "Please enter a valid email address" });
      return false;
    }
    return true;
  }, [formData]);

  // ADD: getFieldError function
  const getFieldError = useCallback((fieldName: string, globalError?: string) => {
    // Return field-specific error or global error if it relates to this field
    if (globalError) {
      const lowerError = globalError.toLowerCase();
      if (fieldName === 'emailAddress' && (lowerError.includes('email') || lowerError.includes('identifier'))) {
        return globalError;
      }
      if (fieldName === 'password' && lowerError.includes('password')) {
        return globalError;
      }
    }
    return null;
  }, []);

  const handleClerkError = useCallback((err: unknown) => {
    if (err && typeof err === "object" && "errors" in err) {
      const clerkErrors = (err as { errors: ClerkError[] }).errors;
      if (clerkErrors?.length) {
        const error = clerkErrors[0];
        console.error('Clerk error details:', error);

        let errorMessage = error.message || "An error occurred during sign in";

        switch (error.code) {
          case 'form_identifier_not_found':
            errorMessage = "No account found with this email address.";
            break;
          case 'form_password_incorrect':
            errorMessage = "Incorrect password. Please try again.";
            break;
          case 'form_identifier_exists_verification_required':
            errorMessage = "Please check your email and verify your account before signing in.";
            break;
          case 'too_many_requests':
            errorMessage = "Too many attempts. Please wait a moment and try again.";
            break;
          case 'session_exists':
            errorMessage = "You're already signed in. Redirecting...";
            break;
        }

        setErrors({
          message: errorMessage,
          code: error.code,
        });
      } else {
        setErrors({ message: "An unexpected error occurred during sign in" });
      }
    } else {
      setErrors({ message: "An unexpected error occurred. Please try again." });
    }
  }, []);

  const handleUrlError = useCallback((errorParam: string | null) => {
    if (errorParam) {
      switch (errorParam) {
        case 'activation_failed':
          setErrors({ message: 'Session activation failed. Please try signing in again.' });
          break;
        case 'auth_failed':
          setErrors({ message: 'Authentication failed. Please try again.' });
          break;
        default:
          setErrors({ message: 'An authentication error occurred. Please try again.' });
      }
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      emailAddress: "",
      password: "",
    });
    setErrors(null);
    setIsLoading(false);
  }, []);

  return {
    formData,
    errors,
    isLoading,
    handleInputChange,
    clearErrors,
    setLoadingState,
    handleClerkError,
    handleUrlError,
    resetForm,
    setErrors,
    validateForm, // ADD: Export validateForm
    getFieldError  // ADD: Export getFieldError
  };
}