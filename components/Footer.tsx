import React from 'react'

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full py-2 text-center text-sm text-gray-500 border-t">
      &copy; {year} Hojo. All rights reserved.
    </footer>
  )
}

export default Footer
