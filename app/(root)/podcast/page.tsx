'use client';

import React from 'react';
import { Mic, UploadCloud, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const PodcastUnderConstruction = () => {
  return (
    <section className="pt-[120px] min-h-screen bg-white dark:bg-black py-20 px-4 transition-colors duration-300">
      <div className="max-w-5xl mx-auto text-center">
        {/* Animated Logo */}
        <div className="relative mb-12">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-r from-[#EF3866] to-[#ff4d7a] shadow-xl flex items-center justify-center">
            <Link href="/">
              <Image
                src="/img/logo.png"
                alt="Logo"
                width={80}
                height={80}
                className="animate-pulse"
              />
            </Link>
          </div>
          <div className="absolute -top-4 -right-4 w-6 h-6 rounded-full bg-[#EF3866] opacity-60 animate-bounce delay-100"></div>
          <div className="absolute -bottom-3 -left-5 w-4 h-4 rounded-full bg-[#EF3866] opacity-50 animate-bounce delay-300"></div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold font-sora text-gray-900 dark:text-white mb-4">
          <span className="text-[#EF3866]">Podcast Studio</span><br />
          Coming Soon
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-xl mx-auto font-sora mb-12">
          A platform where your words become voice. Upload scripts, and let AI transform them into compelling podcast episodes.
        </p>

        {/* Updated Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              title: 'AI Voice Performances',
              desc: 'Your scripts brought to life through expressive, human-like AI narration.',
              icon: <Mic className="text-[#EF3866] w-6 h-6" />,
            },
            {
              title: 'Script Uploads',
              desc: 'Authors can submit their narratives, research, or articles for instant production.',
              icon: <UploadCloud className="text-[#EF3866] w-6 h-6" />,
            },
            {
              title: 'Automated Story Engine',
              desc: 'From text to polished audio — experience seamless storytelling powered by AI.',
              icon: <Sparkles className="text-[#EF3866] w-6 h-6" />,
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-xl transition"
            >
              <div className="w-12 h-12 mx-auto mb-4 bg-[#EF3866]/10 rounded-full flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-sora">{feature.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-sora">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-12 max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-[#EF3866] font-semibold mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-sora text-gray-900 dark:text-white">Launch Progress</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-[#EF3866] to-[#ff4d7a] w-[75%] transition-all duration-1000 ease-out"></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-sora">75% Complete – Finalizing voice synthesis & script pipeline</p>
        </div>

        {/* Waitlist / Social Proof */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-sora">Join 500+ early contributors & listeners</p>
          <div className="flex justify-center items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-[#EF3866] to-[#ff4d7a] text-white flex items-center justify-center border-2 border-white dark:border-gray-900 text-sm font-bold"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-sora">+ more waiting</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PodcastUnderConstruction;
