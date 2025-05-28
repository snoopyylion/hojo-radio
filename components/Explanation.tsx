import Image from 'next/image'
import React from 'react'

const Explanation = () => {
  return (
    <section className="font-sora w-full bg-white dark:bg-black transition-colors duration-300 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-32">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-sora text-3xl md:text-4xl font-bold text-gray-900 dark:text-white transition-colors mb-4">
            How Hojo Works
          </h2>
          <p className="font-sora text-xl text-gray-600 dark:text-gray-300 transition-colors max-w-2xl mx-auto">
            Our AI-powered verification platform analyzes news in just seconds
          </p>
        </div>

        {/* Explanation Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              img: '/img/submit.png',
              title: 'Submit News',
              desc: 'Enter a headline, URL, or claim you want to verify.',
            },
            {
              img: '/img/analyze.png',
              title: 'AI Analysis',
              desc: 'Our AI processes the claim against trusted sources',
            },
            {
              img: '/img/verify.png',
              title: 'Verification Score',
              desc: 'Get a detailed analysis with verification status',
            },
            {
              img: '/img/share.png',
              title: 'Share Results',
              desc: 'Share verified information with confidence',
            },
          ].map(({ img, title, desc }, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-neutral-900 p-6 rounded-xl hover:shadow-lg transition-all duration-300 flex flex-col items-center text-center border border-gray-100 dark:border-neutral-800"
            >
              <div className="mb-4 relative w-20 h-20">
                <Image
                  src={img}
                  alt={title}
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="font-sora text-xl font-semibold text-gray-800 dark:text-gray-100 transition-colors mb-2">
                {title}
              </h3>
              <p className="font-sora text-gray-600 dark:text-gray-400 transition-colors text-sm">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Explanation