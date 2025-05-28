'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { 
  Loader2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar, 
  Shield,
  Eye,
  Search,
  Filter
} from 'lucide-react'
import { gsap } from 'gsap'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('all')
  const [filteredData, setFilteredData] = useState<VerificationItem[]>([])

  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchVerifications = useCallback(async () => {
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
      toast.error('Failed to load verifications', { duration: 6000 })
      setData([])
    } finally {
      setLoading(false)
    }
  }, [getToken])

  // Filter data based on search and verdict filter
  useEffect(() => {
    let filtered = data

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterVerdict !== 'all') {
      filtered = filtered.filter(item => 
        item.verdict.toLowerCase().includes(filterVerdict.toLowerCase())
      )
    }

    setFilteredData(filtered)
  }, [data, searchTerm, filterVerdict])

  // Initial animation
  useEffect(() => {
    if (!loading && headerRef.current && listRef.current) {
      const tl = gsap.timeline()

      gsap.set([headerRef.current, listRef.current], {
        opacity: 0,
        y: 30
      })

      tl.to(headerRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      })
      .to(listRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out"
      }, "-=0.3")
    }
  }, [loading])

  useEffect(() => {
    (async () => {
      await fetchVerifications()
    })()
  }, [fetchVerifications])

  const getVerdictIcon = (verdict: string) => {
    const lowerVerdict = verdict.toLowerCase()
    if (lowerVerdict.includes('true') || lowerVerdict.includes('verified') || lowerVerdict.includes('accurate')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (lowerVerdict.includes('false') || lowerVerdict.includes('fake') || lowerVerdict.includes('misleading')) {
      return <XCircle className="w-5 h-5 text-red-500" />
    } else {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getVerdictColor = (verdict: string) => {
    const lowerVerdict = verdict.toLowerCase()
    if (lowerVerdict.includes('true') || lowerVerdict.includes('verified') || lowerVerdict.includes('accurate')) {
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
    } else if (lowerVerdict.includes('false') || lowerVerdict.includes('fake') || lowerVerdict.includes('misleading')) {
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    } else {
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
    }
  }

  const handleDelete = (id: string) => {
    toast.custom(
      (t) => (
        <div
          className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center sm:text-left text-sm text-gray-800 dark:text-gray-200 font-medium font-sora">
            Are you sure you want to delete this verification?
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                toast.dismiss(t.id)
                handleDeleteConfirmed(id)
              }}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition font-sora"
            >
              Yes
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-gray-100 text-sm rounded-lg transition font-sora"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        id: `delete-confirm-${id}`,
        duration: 15000,
      }
    )
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

      toast.success('Verification deleted successfully', { duration: 4000 })
      setData((prev) => prev.filter((item) => item.id !== id))

      // Animate removal
      const itemElement = document.querySelector(`[data-item-id="${id}"]`)
      if (itemElement) {
        gsap.to(itemElement, {
          opacity: 0,
          height: 0,
          duration: 0.3,
          ease: "power2.inOut"
        })
      }
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete verification', { duration: 6000 })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-[#EF3866] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 font-sora">Loading your verified news...</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* Header Section */}
      <div ref={headerRef} className="mb-8 opacity-0">
        {/* Stats Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors duration-300">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#EF3866] to-[#D53059] rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sora transition-colors">
                  Verification History
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-sora transition-colors">
                  You've verified <strong>{data.length}</strong> news item{data.length === 1 ? '' : 's'} so far
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Eye className="w-4 h-4" />
              <span className="font-sora">Total Verifications: {data.length}</span>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        {data.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search headlines or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-[#EF3866] focus:border-[#EF3866] transition-colors font-sora"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterVerdict}
                  onChange={(e) => setFilterVerdict(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#EF3866] focus:border-[#EF3866] transition-colors font-sora appearance-none cursor-pointer"
                >
                  <option value="all">All Verdicts</option>
                  <option value="true">Verified/True</option>
                  <option value="false">False/Misleading</option>
                  <option value="partial">Partially True</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div ref={listRef} className="opacity-0">
        {filteredData.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center transition-colors duration-300">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
              <Shield className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-sora transition-colors">
              {data.length === 0 ? 'No Verifications Yet' : 'No Results Found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 font-sora transition-colors">
              {data.length === 0 
                ? 'Start verifying news articles to see your history here.' 
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredData.map((item, index) => (
              <div
                key={item.id}
                data-item-id={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-shrink-0 mt-1">
                        {getVerdictIcon(item.verdict)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white font-sora transition-colors line-clamp-2">
                          {item.headline}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium font-sora transition-colors ${getVerdictColor(item.verdict)}`}>
                            {item.verdict}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    {item.content && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm font-sora transition-colors line-clamp-2 mb-4">
                        {item.content}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 transition-colors">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span className="font-sora">{formatDate(item.created_at)}</span>
                      </div>
                      <span className="text-xs font-sora">Verification #{index + 1}</span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Delete verification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifiedList