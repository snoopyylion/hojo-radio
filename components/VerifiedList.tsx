'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

type VerificationItem = {
    id: string
    headline: string
    content: string
    verdict: string
    created_at: string
  }

const VerifiedList = () => {
   
      
  const [data, setData] = useState<VerificationItem[]>([])  
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        const res = await fetch('/api/news-verification/verification-list?page=1&limit=10')
        if (!res.ok) throw new Error('Failed to fetch verifications')
        const json = await res.json()

        if (Array.isArray(json.data)) {
          setData(json.data)
          setTotal(json.pagination?.total || 0)
        } else {
          setData([])
        }
      } catch (error) {
        console.error('Error fetching verifications:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchVerifications()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="animate-spin h-6 w-6 text-white" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="max-w-4xl mx-auto mt-10 px-4"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
        Your Verified News History
      </h2>

      <p className="text-center text-sm text-gray-400 mb-6">
        You’ve verified <strong>{total}</strong> news item{total === 1 ? '' : 's'} so far.
      </p>

      {data.length === 0 ? (
        <p className="text-center text-gray-300">No verifications yet.</p>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white/10 border border-white/20 rounded-lg p-4 shadow-sm backdrop-blur-md"
            >
              <div className="text-white font-semibold text-lg mb-1">
                {item.headline}
              </div>
              <div className="text-teal-300 text-sm">Verdict: {item.verdict}</div>
              <div className="text-gray-400 text-xs mt-1">
                Submitted on: {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default VerifiedList
