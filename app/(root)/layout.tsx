import Footer from '@/components/Footer'
import NewNavbar from '@/components/NewNavbar'
import React from 'react'

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main>
        <NewNavbar/>
           {children}
        <Footer/>
    </main>
  )
}
