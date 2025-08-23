'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BackButton = () => {
  const router = useRouter();

  const handleBack = () => {
    // First try to go back in history
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to blog page if no history
      router.push('/home/blog');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 py-2 text-sm font-normal text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Blog
    </button>
  );
};

export default BackButton;