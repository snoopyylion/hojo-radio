// components/UserProfile/VerifiedNewsList.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Shield, ExternalLink, Calendar, Eye, ChevronDown, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsSource {
  name: string;
  url: string;
  credibility_score: number;
}

interface VerifiedNews {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  published_at: string;
  verified_at: string;
  image_url?: string;
  external_url: string;
  sources?: NewsSource[];
  views_count: number;
  credibility_score: number;
  is_fake?: boolean;
  has_matching_source?: boolean;
  verdict?: string;
  confidence_level?: string;
}

interface VerifiedNewsListProps {
  news: VerifiedNews[];
  loading?: boolean;
  itemsPerPage?: number;
}

export const VerifiedNewsList: React.FC<VerifiedNewsListProps> = ({ 
  news, 
  loading = false,
  itemsPerPage = 10
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(news.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNews = news.slice(startIndex, endIndex);

  useEffect(() => {
    if (containerRef.current && !loading) {
      const items = containerRef.current.querySelectorAll('.news-item');
      gsap.fromTo(items, 
        { opacity: 0, y: 30 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out"
        }
      );
    }
  }, [currentNews, loading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50';
    if (score >= 60) return 'text-slate-700 bg-slate-50 dark:text-slate-300 dark:bg-slate-950/50';
    if (score >= 40) return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50';
    return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/50';
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'verified':
      case 'true':
        return 'text-emerald-700 dark:text-emerald-300';
      case 'likely fake':
      case 'fake':
      case 'false':
        return 'text-red-700 dark:text-red-300';
      case 'misleading':
        return 'text-orange-700 dark:text-orange-300';
      default:
        return 'text-amber-700 dark:text-amber-300';
    }
  };

  const handleReadFullArticle = (article: VerifiedNews) => {
    if (article.sources && article.sources.length > 1) {
      setSelectedArticle(article.id);
      setShowSourceModal(true);
    } else if (article.sources && article.sources.length === 1) {
      const url = article.sources[0].url;
      if (url && url !== '#' && url.startsWith('http')) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } else if (article.external_url && article.external_url !== '#' && article.external_url.startsWith('http')) {
      window.open(article.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSourceSelect = (url: string) => {
    if (url && url !== '#' && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setShowSourceModal(false);
    setSelectedArticle(null);
  };

  const closeModal = () => {
    setShowSourceModal(false);
    setSelectedArticle(null);
  };

  const shouldShowReadLink = (article: VerifiedNews) => {
    if (article.is_fake) return false;
    if (article.has_matching_source === false) return false;
    
    if (article.sources && article.sources.length > 0) {
      const hasValidSources = article.sources.some(source => 
        source.url && source.url !== '#' && source.url.startsWith('http')
      );
      if (hasValidSources) return true;
    }
    
    if (article.external_url && article.external_url !== '#' && article.external_url.startsWith('http')) {
      return true;
    }
    
    return false;
  };

  const getSelectedArticle = () => {
    return news.find(article => article.id === selectedArticle);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield size={64} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No verified news yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          No verified news articles have been processed yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="space-y-6">
        {currentNews.map((article) => (
          <div
            key={article.id}
            className="news-item group bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-slate-400/30 dark:hover:border-slate-500/30 transition-all duration-300"
          >
            <div className="flex gap-4">
              {article.image_url && (
                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={article.image_url}
                    alt={article.title}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getCredibilityColor(article.credibility_score)}`}>
                      {article.credibility_score}%
                    </div>
                    {article.is_fake ? (
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={16} className="text-red-500" />
                        <span className="text-xs text-red-500 font-semibold">FAKE</span>
                      </div>
                    ) : (
                      <Shield size={16} className="text-slate-600 dark:text-slate-400" />
                    )}
                  </div>
                </div>
                
                {article.verdict && (
                  <div className="mb-2">
                    <span className={`text-sm font-semibold ${getVerdictColor(article.verdict)}`}>
                      Verdict: {article.verdict}
                    </span>
                    {article.confidence_level && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({article.confidence_level} confidence)
                      </span>
                    )}
                  </div>
                )}
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{article.views_count}</span>
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{article.source}</span>
                    {article.sources && article.sources.length > 1 && (
                      <span className="text-slate-600 dark:text-slate-400 text-xs">
                        {article.sources.length} sources available
                      </span>
                    )}
                  </div>
                  
                  {shouldShowReadLink(article) && (
                    <button
                      onClick={() => handleReadFullArticle(article)}
                      className="flex items-center gap-1 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 text-sm font-medium transition-colors"
                    >
                      <span>Read Full Article</span>
                      {article.sources && article.sources.length > 1 ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                    </button>
                  )}
                </div>
                
                {(article.is_fake || (!article.sources?.length && !article.external_url)) && (
                  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800/50">
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      {article.is_fake 
                        ? "⚠️ This article has been identified as potentially fake or misleading." 
                        : "ℹ️ No reliable sources found for this article."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 px-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </button>
          
          <div className="flex gap-1">
            {generatePageNumbers().map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && handlePageChange(page)}
                disabled={page === '...'}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${page === currentPage
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800'
                    : page === '...'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Page Info */}
      {totalPages > 1 && (
        <div className="text-center mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(endIndex, news.length)} of {news.length} articles
          </p>
        </div>
      )}

      {/* Responsive Source Selection Modal */}
      {showSourceModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-black rounded-xl w-full max-w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                    Choose Source to Read
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 leading-relaxed">
                    This news is available from multiple verified sources. Choose which one to read:
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -m-1 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X size={18} className="sm:hidden" />
                  <X size={20} className="hidden sm:block" />
                </button>
              </div>
            </div>
            
            <div className="p-3 sm:p-6 space-y-2 sm:space-y-3 max-h-[60vh] sm:max-h-96 overflow-y-auto">
              {getSelectedArticle()?.sources
                ?.filter(source => source.url && source.url !== '#' && source.url.startsWith('http'))
                .map((source, index) => (
                <button
                  key={index}
                  onClick={() => handleSourceSelect(source.url)}
                  className="w-full text-left p-3 sm:p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-slate-400/50 dark:hover:border-slate-600/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-slate-400/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base leading-tight">
                        {source.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate leading-relaxed">
                        {source.url}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getCredibilityColor(source.credibility_score)}`}>
                          {source.credibility_score}% credible
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-slate-600 dark:text-slate-400 ml-2 flex-shrink-0 sm:w-4 sm:h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};