import React from 'react'
import LinkButton from './LinkButton'
import Image from 'next/image'

const Hero = () => {
  return (
    <section className="w-full h-screen py-16 bg-white">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        {/* Hero Left */}
        <div className="hero-left md:w-1/2 w-full text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-snug">
            Empowering <span className="text-[#EF3866]">Informed <br className="hidden sm:block"/>Decisions</span> with Reliable News
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-8 max-w-[600px] mx-auto md:mx-0">
            Hojo fights misinformation head-on, equipping you with cutting-edge AI tools to verify the news you consume. Search for articles and instantly access real-time accuracy checks, ensuring you only engage with credible information that matters to you.
          </p>
          <div className="flex justify-center md:justify-start">
            <LinkButton title="Verify News" href="/" />
          </div>
        </div>

        {/* Hero Right */}
        <div className="hero-right md:w-1/2 w-[90dvw] mt-10 md:mt-0 flex justify-end">
          <Image
            src="/img/heroimg.png"
            alt="hero"
            width={600}
            height={600}
            className="w-full max-w-[600px] h-auto object-cover"
          />
        </div>
      </div>
    </section>
  )
}

export default Hero
