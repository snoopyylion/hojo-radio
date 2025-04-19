import React from 'react'
import LinkButton from './LinkButton'
import Image from 'next/image'

const Hero = () => {
  return (
    <section className="w-full min-h-[500px] py-16 pt-[100px] sm:pt-[120px] md:pt-[150px] bg-white dark:bg-black transition-colors duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-32 flex flex-col md:flex-row items-center justify-between">
        {/* Hero Left */}
        <div className="hero-left md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-snug text-gray-900 dark:text-white transition-colors">
            Empowering <span className="text-[#EF3866]">Informed <br className="hidden sm:block" />Decisions</span> with Reliable News
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-[600px] mx-auto md:mx-0 transition-colors">
            Hojo fights misinformation head-on, equipping you with cutting-edge AI tools to verify the news you consume. Search for articles and instantly access real-time accuracy checks, ensuring you only engage with credible information that matters to you.
          </p>
          <div className="flex justify-center md:justify-start">
            <LinkButton title="Verify News" href="/verify-news" />
          </div>
        </div>
        
        {/* Hero Right */}
        <div className="hero-right md:w-1/2 w-full mt-10 md:mt-0 flex justify-center md:justify-end">
          <Image
            src="/img/heroimg.png"
            alt="hero"
            width={600}
            height={600}
            className="w-full max-w-[600px] rounded-3xl h-auto object-cover border border-gray-200 dark:border-gray-700 transition-colors"
          />
        </div>
      </div>
    </section>
  )
}

export default Hero
