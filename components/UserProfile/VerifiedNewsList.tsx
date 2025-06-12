// components/UserProfile/VerifiedNewsList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Shield, ExternalLink, Calendar, Eye } from 'lucide-react';

interface VerifiedNews {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  published_at: string;
  verified_at: string;
  image_url?: string;
  external_url: string;
  views_count: number;
  credibility_score: number;
}

interface VerifiedNewsListProps {
  news: VerifiedNews[];
  loading?: boolean;
}

export const VerifiedNewsList: React.FC<VerifiedNewsListProps> = ({ 
  news, 
  loading = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, [news, loading]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
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
          No verified news articles have been shared yet.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {news.map((article) => (
        <div
          key={article.id}
          className="news-item group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg hover:border-[#EF3866]/30 transition-all duration-300"
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
                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-[#EF3866] transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <div className="flex items-center gap-2 ml-4">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getCredibilityColor(article.credibility_score)}`}>
                    {article.credibility_score}%
                  </div>
                  <Shield size={16} className="text-[#EF3866]" />
                </div>
              </div>
              
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
                  <span className="font-medium text-[#EF3866]">{article.source}</span>
                </div>
                
                <a
                  href={article.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[#EF3866] hover:text-[#d7325a] text-sm font-medium transition-colors"
                >
                  <span>Read Full Article</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};