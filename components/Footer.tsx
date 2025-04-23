import Image from 'next/image'
import React from 'react'
import {
  Facebook,
  Instagram,
  Twitter as X
} from 'lucide-react'

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white dark:bg-black border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-8 sm:px-6 sm:py-10">
      <div className="w-full max-w-7xl mx-auto">
        {/* Footer Top */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 sm:gap-8 md:gap-10 mb-8 md:mb-12 lg:mb-16">
          {/* Left Section */}
          <div className="flex flex-col items-center md:items-start w-full md:w-1/3">
            <Image
              src="/img/footerlogo.png"
              alt="Hojo logo"
              width={80}
              height={80}
              className="mb-3 block dark:hidden"
            />
            {/* Dark mode logo with invert filter for better visibility */}
            <Image
              src="/img/footerlogo.png"
              alt="Hojo logo"
              width={80}
              height={80}
              className="mb-3 hidden dark:block dark:invert dark:brightness-200 dark:contrast-200"
            />
            <h5 className="leading-relaxed max-w-sm text-xs sm:text-sm md:text-base text-center md:text-left">
              Cutting through misinformation with AI-driven analysis, providing real-time verification on trending news.
            </h5>
          </div>

          {/* Right Section */}
          <div className="flex flex-row justify-between md:justify-end gap-4 xs:gap-6 sm:gap-8 md:gap-10 lg:gap-12 w-full md:w-2/3">
            <div className="w-24 sm:w-28 md:w-32">
              <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">Quick Links</h3>
              <ul className="space-y-1 text-xs sm:text-sm">
                <li>Home</li>
                <li>Podcast</li>
                <li>Pricing</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div className="w-24 sm:w-28 md:w-32">
              <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">Company</h3>
              <ul className="space-y-1 text-xs sm:text-sm">
                <li>About</li>
                <li>Podcast</li>
                <li>Blog</li>
                <li>Contact</li>
                <li>Career</li>
              </ul>
            </div>
            <div className="w-24 sm:w-28 md:w-32">
              <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">Legal</h3>
              <ul className="space-y-1 text-xs sm:text-sm">
                <li>Privacy</li>
                <li>Terms</li>
                <li>Cookies</li>
              </ul>
            </div>
          </div>
        </div>

        <hr className="border-t border-gray-300 dark:border-gray-600" />

        {/* Footer Bottom */}
        <div className="flex flex-row justify-between items-center pt-4 sm:pt-6 text-xs sm:text-sm">
          <div className="mb-3 xs:mb-0">
            &copy; {year} Hojo. All rights reserved.
          </div>
          <div className="flex gap-3 sm:gap-4 text-gray-600 dark:text-gray-400">
            <a href="#" aria-label="Facebook" className="hover:text-blue-600">
              <Facebook size={18} />
            </a>
            <a href="#" aria-label="X (Twitter)" className="hover:text-black dark:hover:text-white">
              <X size={18} />
            </a>
            <a href="#" aria-label="Instagram" className="hover:text-pink-500">
              <Instagram size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer