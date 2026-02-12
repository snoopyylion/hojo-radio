"use client"
import { Bounded } from '@/components/Bounded'
import { Canvas } from '@react-three/fiber'
import React from 'react'
import { RadioHouseScene } from '../Scene/RadioHouseScene'

const LHero = () => {
    return (
        <section className='text-white hojo-gradient-bg relative h-dvh w-dvw text-shadow-black/30 text-shadow-lg'>

            <div className="hero-scene sticky pointer-events-none top-0 h-dvh w-full">
                {/* canvas here */}
                <Canvas shadows="soft">
                    <RadioHouseScene />
                </Canvas>
            </div>
            <div className="hero-content absolute inset-x-0 top-0 h-dvh">
                <Bounded fullWidth className='absolute top-18 inset-x-0 md:top-24 md:left-[8vw] max-w-[900px]'>
                    <div className="main-text">
                        <h1 className='hero-heading font-black-slanted text-4xl leading-[0.8] uppercase sm:text-5xl lg:text-6xl'>Where Voices Go Live and Events Come Alive</h1>
                    </div>
                </Bounded>

                <Bounded fullWidth className='hero-body absolute bottom-0 inset-x-0 md:right-[8vw] md:left-auto'innerClassName='flex flex-col gap-4'>
                    <div className="assitant-text max-w-md">
                        <h2 className='font-bold-slanted mb-1 text-2xl uppercase lg:mb-2 lg:text-4xl'>Hojo bridges content, sound, and experiences</h2>
                        <p className='font-sora'>your central hub for blogs, podcasts, and event tickets.</p>
                    </div>
                    <button className='group font-black-slanted hojo-btn flex w-fit cursor-pointer items-center gap-1 rounded bg-[#EF3866] px-3 py-1 text-2xl uppercase transition disabled:grayscale '>
                        Get Started
                        <span className='group-hover:translate-x-1 transition'>
                            {">"}
                        </span>
                    </button>
                </Bounded>
            </div>
        </section>
    )
}

export default LHero
