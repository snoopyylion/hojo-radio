'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

interface LinkButtonProps {
  title: string
  href: string
}

const LinkButton: React.FC<LinkButtonProps> = ({ title, href }) => {
  return (
    <Link href={href}>
      <button className="flex items-center gap-2 bg-[#EF3866] hover:bg-[#d7325a] text-white font-semibold px-4 py-2 rounded-full transition-all text-sm md:text-base">
        <span>{title}</span>
        <Image
          src="/icons/arrow-circle-right.png"
          alt="arrow"
          width={40}
          height={40}
          className="w-6 h-6 md:w-8 md:h-8"
        />
      </button>
    </Link>
  )
}

export default LinkButton
