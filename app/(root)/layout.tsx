import Footer from '@/components/Footer'
import NewNavbar from '@/components/NewNavbar'
import React from 'react'

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className='bg-gray-50 dark:bg-black transition-colors duration-300'>
        <NewNavbar/>
           {children}
        <Footer/>
    </main>
  )
}
