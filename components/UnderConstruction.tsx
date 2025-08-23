"use client";

import React from 'react';
import { Construction, Hammer, Wrench, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface UnderConstructionProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  features?: string[];
  progress?: number;
  estimatedCompletion?: string;
}

const UnderConstruction: React.FC<UnderConstructionProps> = ({
  title = "Under Construction",
  description = "We're working hard to bring you this feature. Please check back soon!",
  showBackButton = true,
  backHref = "/home",
  backLabel = "Back to Home",
  features = ["Feature One", "Feature Two"],
  progress = 60,
  estimatedCompletion = "Coming Soon"
}) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#EF3866]/10 dark:bg-[#EF3866]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#EF3866]/5 dark:bg-[#EF3866]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#EF3866]/5 dark:bg-[#EF3866]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full text-center relative z-10">
        {/* Animated Construction Icons */}
        <div className="relative mb-8">
          <div className="flex justify-center items-center space-x-4">
            <div className="animate-bounce">
              <Construction className="w-16 h-16 text-[#EF3866] dark:text-[#EF3866]" />
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.2s' }}>
              <Hammer className="w-12 h-12 text-[#EF3866] dark:text-[#EF3866]" />
            </div>
            <div className="animate-bounce" style={{ animationDelay: '0.4s' }}>
              <Wrench className="w-14 h-14 text-[#EF3866] dark:text-[#EF3866]" />
            </div>
          </div>
          
          {/* Floating particles effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-1/4 w-2 h-2 bg-[#EF3866] rounded-full animate-ping opacity-75"></div>
            <div className="absolute top-8 right-1/4 w-1 h-1 bg-[#EF3866] rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute bottom-4 left-1/3 w-1.5 h-1.5 bg-[#EF3866] rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-12 left-1/2 w-1 h-1 bg-[#EF3866] rounded-full animate-ping opacity-75" style={{ animationDelay: '1.5s' }}></div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-black rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500 mr-3" />
              <Sparkles className="w-4 h-4 text-[#EF3866] absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
            {description}
          </p>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <span>{estimatedCompletion}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-[#EF3866] h-3 rounded-full animate-pulse transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{progress}% Complete</p>
          </div>

          {/* Features preview */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {features.slice(0, 2).map((feature, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <div className={`w-8 h-8 ${
                  index === 0 ? 'bg-[#EF3866]/10 dark:bg-[#EF3866]/20' : 'bg-[#EF3866]/10 dark:bg-[#EF3866]/20'
                } rounded-lg flex items-center justify-center mb-2 mx-auto`}>
                  <span className="text-sm font-bold text-[#EF3866]">
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{feature}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {showBackButton && (
              <Link
                href={backHref}
                className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-200 border border-gray-200 dark:border-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backLabel}
              </Link>
            )}
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center w-full px-6 py-3 text-sm font-medium text-white bg-[#EF3866] rounded-lg hover:bg-[#EF3866]/90 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Go Back
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            We're building something amazing for you! 🚀
          </p>
          <div className="flex justify-center mt-2 space-x-1">
            <div className="w-2 h-2 bg-[#EF3866] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#EF3866] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderConstruction;
