'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

type VerificationItem = {
  id: string
  headline: string
  content: string
  verdict: string
  created_at: string
}

const VerifiedList = () => {
  const { getToken } = useAuth()
  const [data, setData] = useState<VerificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVerifications = async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/news-verification/verification-list?page=1&limit=10', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error('Failed to fetch verifications')

      const json = await res.json()
      if (Array.isArray(json.verifications)) {
        setData(json.verifications)
      } else {
        setData([])
      }
    } catch (error) {
      console.error('Error fetching verifications:', error)
      toast.error('Failed to load verifications')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Safe, self-calling async function inside useEffect
    ;(async () => {
      await fetchVerifications()
    })()
  }, []) // Run only on mount

  const handleDelete = (id: string) => {
    toast.custom((t) => (
      <div
        className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center sm:text-left text-sm text-gray-800 dark:text-gray-200 font-medium">
          Are you sure you want to delete this verification?
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              toast.dismiss(t.id)
              handleDeleteConfirmed(id)
            }}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition"
          >
            Yes
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-900 text-sm rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    ))
  }

  const handleDeleteConfirmed = async (id: string) => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/news-verification/verification-list?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error('Delete failed')

      toast.success('Verification deleted successfully')
      setData((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete verification')
    }
  }

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
        You’ve verified <strong>{data.length}</strong> news item{data.length === 1 ? '' : 's'} so far.
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
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-semibold text-lg mb-1">{item.headline}</div>
                  <div className="text-teal-300 text-sm">Verdict: {item.verdict}</div>
                  <div className="text-gray-400 text-xs mt-1">
                    Submitted on: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-400 hover:text-red-300 ml-4"
                  title="Delete verification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default VerifiedList
