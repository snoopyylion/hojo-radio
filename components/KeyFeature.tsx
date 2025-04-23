import Image from 'next/image'
import React from 'react'

const KeyFeature = () => {
  return (
    <div className="w-full px-4 py-16 sm:py-20 bg-white dark:bg-black text-gray-800 dark:text-gray-200">
      <div className="max-w-7xl mx-auto text-center">
        {/* Section Header */}
        <h5 className="inline-block bg-[#FCE8E9] text-[#B41C45] px-4 py-1.5 rounded-lg text-sm font-medium mb-4 transform transition-transform hover:scale-105 duration-300">
          Key Features
        </h5>
        <h2 className="text-3xl sm:text-4xl font-bold mb-3">
          AI-Powered News Verification
        </h2>
        <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-12 sm:mb-16">
          Our advanced AI algorithms analyze multiple factors to determine the credibility of news articles.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm group hover:shadow-xl hover:border-pink-100 dark:hover:border-pink-900 transform transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-50 to-blue-50 dark:from-pink-950 dark:to-blue-950 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="h-16 w-16 rounded-full bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center mb-6 transform transition-transform group-hover:scale-110 duration-300">
              <Image src="/img/mark.png" alt="Credibility Scoring" width={40} height={40} className="group-hover:rotate-6 transition-transform duration-300" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">Credibility Scoring</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get instant credibility scores based on source reputation, fact-checking, and content analysis.
            </p>
            <div className="w-12 h-1 bg-pink-200 dark:bg-pink-800 rounded-full mt-6 group-hover:w-16 transition-all duration-300"></div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm group hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900 transform transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-6 transform transition-transform group-hover:scale-110 duration-300">
              <Image src="/img/bias.png" alt="Bias Detection" width={40} height={40} className="group-hover:rotate-6 transition-transform duration-300" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">Bias Detection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Identify potential political or ideological bias in news reporting with our advanced language analysis.
            </p>
            <div className="w-12 h-1 bg-blue-200 dark:bg-blue-800 rounded-full mt-6 group-hover:w-16 transition-all duration-300"></div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl p-8 sm:p-10 flex flex-col items-center text-center shadow-sm group hover:shadow-xl hover:border-purple-100 dark:hover:border-purple-900 transform transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="h-16 w-16 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-6 transform transition-transform group-hover:scale-110 duration-300">
              <Image src="/img/trend.png" alt="Trending Analysis" width={40} height={40} className="group-hover:rotate-6 transition-transform duration-300" />
            </div>
            <h3 className="text-xl font-semibold mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">Trending Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See how a story evolves across multiple sources and track its verification status in real-time.
            </p>
            <div className="w-12 h-1 bg-purple-200 dark:bg-purple-800 rounded-full mt-6 group-hover:w-16 transition-all duration-300"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KeyFeature