"use client";

import { useEffect, useState } from "react";

interface LoadingState {
  stage: 'loading' | 'syncing' | 'finalizing' | 'complete';
  message: string;
  progress: number;
}

interface PageLoaderProps {
  /** Custom loading message */
  message?: string;
  /** Show progress bar */
  showProgress?: boolean;
  /** Custom progress value (0-100) */
  progress?: number;
  /** Loading stage for different icons/messages */
  stage?: 'loading' | 'syncing' | 'finalizing' | 'complete';
  /** Custom className for container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show animated steps */
  showSteps?: boolean;
}

export default function PageLoader({
  message,
  showProgress = true,
  progress,
  stage = 'loading',
  className = "",
  size = 'md',
  showSteps = false
}: PageLoaderProps) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'loading',
    message: message || 'Loading your content...',
    progress: progress || 0
  });

  // Auto-progress animation when no custom progress is provided
  useEffect(() => {
    if (progress !== undefined) return;

    const stages: LoadingState[] = [
      { stage: 'loading', message: message || 'Loading your content...', progress: 25 },
      { stage: 'syncing', message: 'Fetching your data...', progress: 60 },
      { stage: 'finalizing', message: 'Almost ready...', progress: 90 },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setLoadingState(stages[currentStage]);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [message, progress]);

  // Update state when props change
  useEffect(() => {
    if (progress !== undefined || message) {
      setLoadingState(prev => ({
        ...prev,
        stage,
        message: message || prev.message,
        progress: progress !== undefined ? progress : prev.progress
      }));
    }
  }, [message, progress, stage]);

  const getStatusIcon = () => {
    const sizeClasses = {
      sm: "w-6 h-6",
      md: "w-8 h-8", 
      lg: "w-10 h-10"
    };
    
    const iconProps = `${sizeClasses[size]} text-white`;

    switch (loadingState.stage) {
      case 'loading':
        return (
          <svg className={`${iconProps} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v4m0 8v4m8-8h-4M4 12h4" />
          </svg>
        );
      case 'syncing':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'finalizing':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'complete':
        return (
          <svg className={iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return (
          <div className={`${sizeClasses[size]} border-4 border-white border-t-transparent rounded-full animate-spin`}></div>
        );
    }
  };

  const getContainerSize = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12';
      case 'md':
        return 'w-16 h-16';
      case 'lg':
        return 'w-20 h-20';
      default:
        return 'w-16 h-16';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-lg';
      case 'md':
        return 'text-2xl';
      case 'lg':
        return 'text-3xl';
      default:
        return 'text-2xl';
    }
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 transition-colors duration-300 ${className}`}>
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className={`${getContainerSize()} bg-[#EF3866] rounded-full flex items-center justify-center mx-auto mb-4`}>
            {getStatusIcon()}
          </div>
          
          <h1 className={`${getTextSize()} font-bold text-gray-800 dark:text-white mb-2 font-sora transition-colors`}>
            {loadingState.stage === 'complete' ? 'Ready!' : 'Loading'}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4 font-sora transition-colors">
            {loadingState.message}
          </p>

          {/* Progress indicator */}
          {showProgress && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4 transition-colors">
              <div
                className="h-full bg-[#EF3866] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingState.progress}%` }}
              />
            </div>
          )}

          {/* Optional loading steps */}
          {showSteps && (
            <div className="flex justify-center space-x-2 mt-4">
              {['loading', 'syncing', 'finalizing'].map((step, index) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                    ['loading', 'syncing', 'finalizing'].indexOf(loadingState.stage) >= index
                      ? 'bg-[#EF3866]'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for inline loading states
export function InlineLoader({ 
  message = "Loading...", 
  size = "sm" 
}: { 
  message?: string; 
  size?: 'xs' | 'sm' | 'md' 
}) {
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-5 h-5",
    md: "w-6 h-6"
  };

  return (
    <div className="flex items-center justify-center space-x-3 py-8">
      <div className={`${sizeClasses[size]} border-2 border-[#EF3866] border-t-transparent rounded-full animate-spin`}></div>
      <span className="text-gray-600 dark:text-gray-400 font-sora transition-colors">{message}</span>
    </div>
  );
}