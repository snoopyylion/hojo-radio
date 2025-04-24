import Image from 'next/image'
import React from 'react'

const OurMission = () => {
  return (
    <section className="w-full bg-white dark:bg-black transition-colors duration-300 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-32">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          {/* Left: Image */}
          <div className="w-full md:w-1/2">
            <Image
              src="/img/mission.png"
              alt="Our mission illustration"
              width={600}
              height={600}
              className="w-full max-w-[600px] h-auto object-cover rounded-3xl border border-gray-200 dark:border-gray-700 shadow-md transition-colors"
            />
          </div>

          {/* Right: Text */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            {/* Section Header */}
            <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
              <span className="inline-block w-8 h-1 bg-[#EF3866] dark:bg-[#ff7a9c] transition-colors"></span>
              <h5 className="uppercase tracking-wide text-sm font-medium text-gray-800 dark:text-gray-200">
                Our Mission
              </h5>
            </div>

            {/* Headline */}
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-snug text-gray-900 dark:text-white transition-colors">
              With <span className="text-[#EF3866] dark:text-[#ff7a9c]">HOJO</span>, the truth is always within reach.
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-6 max-w-[600px] mx-auto md:mx-0 transition-colors">
              In a world overwhelmed by misinformation, we believe everyone deserves access to accurate, verified news.
              Our platform analyzes headlines in real time, separating facts from falsehoods.
            </p>

            {/* Final Statement */}
            <div className="flex items-start gap-3 max-w-[600px] mx-auto md:mx-0">
              <span className="w-2 h-16 bg-[#EF3866] dark:bg-[#ff7a9c] mt-2 rounded transition-colors"></span>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 transition-colors">
                We're not here to tell you what to think — we're here to give you the tools to think critically. With <strong>HOJO</strong>, you gain access to credible, transparent insights that help you make informed decisions about the stories that shape our world.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OurMission
