import React from 'react'
import LinkButton from './LinkButton'
import Image from 'next/image'

const Hero = () => {
  return (
    <section className="w-full h-screen py-16 bg-white">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
        {/* Hero Left */}
        <div className="hero-left md:w-1/2 w-[90dvw] pr-4 md:pr-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Empowering <span className="text-[#EF3866]">Informed <br />Decisions</span> with Reliable News
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-8">
            Hojo fights misinformation head-on, equipping you with cutting-edge AI tools to verify the news you consume. Search for articles and instantly access real-time accuracy checks, ensuring you only engage with credible information that matters to you.
          </p>
          <LinkButton title="Verify News" href="/" />
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
