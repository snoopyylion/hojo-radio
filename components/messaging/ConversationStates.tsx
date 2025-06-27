// components/messaging/ConversationStates.tsx
'use client';

import { useRouter } from 'next/navigation';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState = ({ message = 'Loading conversation...' }: LoadingStateProps) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center p-8">
      <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#EF3866]/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 font-medium">{message}</p>
    </div>
  </div>
);

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 text-red-600 dark:text-red-400">⚠️</div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
        <p className="text-red-600 dark:text-red-400 mb-6 text-sm">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/messages')}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
          >
            Back to Messages
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConversationNotFoundState = () => {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 text-gray-400">💬</div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conversation not found</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
          The conversation may have been deleted or you may not have access to it.
        </p>
        <button
          onClick={() => router.push('/messages')}
          className="px-6 py-3 bg-[#EF3866] text-white rounded-xl hover:bg-[#EF3866]/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          Back to Messages
        </button>
      </div>
    </div>
  );
};

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus = ({ isConnected }: ConnectionStatusProps) => {
  if (isConnected) return null;

  return (
    <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 text-sm">
      <div className="flex items-center">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
        <span className="text-yellow-800 dark:text-yellow-200">Reconnecting...</span>
      </div>
    </div>
  );
};