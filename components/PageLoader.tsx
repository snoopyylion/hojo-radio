"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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

  const getLogoAnimation = () => {
    switch (loadingState.stage) {
      case 'loading':
        return "animate-pulse scale-110";
      case 'syncing':
        return "animate-spin";
      case 'finalizing':
        return "animate-bounce";
      case 'complete':
        return "animate-none scale-110";
      default:
        return "animate-pulse";
    }
  };

  const getLogoSize = () => {
    switch (size) {
      case 'sm':
        return { width: 48, height: 48, container: 'w-16 h-16' };
      case 'md':
        return { width: 80, height: 80, container: 'w-24 h-24' };
      case 'lg':
        return { width: 100, height: 100, container: 'w-28 h-28' };
      default:
        return { width: 80, height: 80, container: 'w-24 h-24' };
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

  const logoConfig = getLogoSize();

  return (
    <div className={`min-h-screen bg-white dark:bg-black flex items-center justify-center p-4 transition-colors duration-300 ${className}`}>
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          {/* Logo Container with Professional Animation */}
          <div className={`${logoConfig.container} mx-auto w-28 h-28 rounded-full bg-gradient-to-r from-[#EF3866] to-[#ff4d7a] shadow-xl mb-6 flex items-center justify-center`}style={{
    background: `
      radial-gradient(circle at 30% 30%, rgba(239, 56, 102, 0.8) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(239, 56, 140, 0.6) 0%, transparent 50%),
      linear-gradient(135deg, #EF3866 0%, #EF5638 25%, #D63866 50%, #EF3884 100%)
    `
  }}>
            <Link href="/" className="block">
              <Image
                src="/img/logo.png"
                alt="Logo"
                width={logoConfig.width}
                height={logoConfig.height}
                className={`transition-all duration-700 ease-in-out ${getLogoAnimation()}`}
                priority
              />
            </Link>
          </div>
          
          <h1 className={`${getTextSize()} font-bold text-gray-800 dark:text-white mb-2 font-sora transition-colors animate-pulse`}>
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

          {/* Stage indicator for complete state */}
          {loadingState.stage === 'complete' && (
            <div className="mt-4">
              <div className="inline-flex items-center space-x-2 text-[#EF3866] font-medium">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Loading Complete</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for inline loading states with logo option
export function InlineLoader({ 
  message = "Loading...", 
  size = "sm",
  useLogo = false
}: { 
  message?: string; 
  size?: 'xs' | 'sm' | 'md';
  useLogo?: boolean;
}) {
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-5 h-5",
    md: "w-6 h-6"
  };

  const logoSizes = {
    xs: { width: 16, height: 16 },
    sm: { width: 20, height: 20 },
    md: { width: 24, height: 24 }
  };

  return (
    <div className="flex items-center justify-center space-x-3 py-8">
      {useLogo ? (
        <div className={`${sizeClasses[size]} flex items-center justify-center`}>
          <Image
            src="/img/logo.png"
            alt="Logo"
            width={logoSizes[size].width}
            height={logoSizes[size].height}
            className="animate-pulse transition-all duration-500"
          />
        </div>
      ) : (
        <div className={`${sizeClasses[size]} border-2 border-[#EF3866] border-t-transparent rounded-full animate-spin`}></div>
      )}
      <span className="text-gray-600 dark:text-gray-400 font-sora transition-colors">{message}</span>
    </div>
  );
}

// Logo-only loader for minimal use cases
export function LogoLoader({ 
  size = 'md',
  className = ""
}: { 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const logoConfig = {
    sm: { width: 48, height: 48, container: 'w-16 h-16' },
    md: { width: 80, height: 80, container: 'w-24 h-24' },
    lg: { width: 100, height: 100, container: 'w-28 h-28' }
  };

  const config = logoConfig[size];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${config.container} flex items-center justify-center`}>
        <Link href="/" className="block">
          <Image
            src="/img/logo.png"
            alt="Logo"
            width={config.width}
            height={config.height}
            className="animate-pulse transition-all duration-700 ease-in-out scale-110"
            priority
          />
        </Link>
      </div>
    </div>
  );
}