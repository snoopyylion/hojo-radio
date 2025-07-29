'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Download, Share2, Image as ImageIcon, Calendar, User } from 'lucide-react';
import { Message } from '@/types/messaging';

interface ImageGalleryProps {
  messages: Message[];
  conversationId: string;
  className?: string;
  initialImageUrl?: string | null;
  onImageClick?: (imageUrl: string) => void;
  showHeader?: boolean;
  compact?: boolean;
}

interface ImageItem {
  id: string;
  url: string;
  caption?: string;
  senderName: string;
  timestamp: string;
  messageId: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  messages,
  className = '',
  initialImageUrl,
  onImageClick,
  showHeader = true,
  compact = false
}) => {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract all images from messages
  const images = useMemo(() => {
    return messages
      .filter(message => message.message_type === 'image' && message.content)
      .map(message => ({
        id: message.id,
        url: message.content,
        caption: message.metadata?.caption,
        senderName: message.sender?.firstName || message.sender?.username || 'Unknown',
        timestamp: message.created_at,
        messageId: message.id
      }))
      .reverse(); // Show newest first
  }, [messages]);

  const handleImageClick = useCallback((image: ImageItem) => {
    setSelectedImage(image);
    setIsModalOpen(true);
    if (onImageClick) {
      onImageClick(image.url);
    }
  }, [onImageClick]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedImage(null);
  }, []);

  const handlePrevious = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setSelectedImage(images[previousIndex]);
  }, [selectedImage, images]);

  const handleNext = useCallback(() => {
    if (!selectedImage) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    const nextIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setSelectedImage(images[nextIndex]);
  }, [selectedImage, images]);

  const handleDownload = useCallback(async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  }, []);

  const handleShare = useCallback(async (imageUrl: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Image',
          text: 'Check out this image from our conversation!',
          url: imageUrl
        });
      } catch (error) {
        console.error('Error sharing image:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl);
        // You could add a toast notification here
      } catch (error) {
        console.error('Error copying image URL:', error);
      }
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isModalOpen) return;
    
    switch (e.key) {
      case 'Escape':
        handleCloseModal();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
    }
  }, [isModalOpen, handleCloseModal, handlePrevious, handleNext]);

  // Open modal when initial image URL is provided
  useEffect(() => {
    if (initialImageUrl && images.length > 0) {
      const image = images.find(img => img.url === initialImageUrl);
      if (image) {
        setSelectedImage(image);
        setIsModalOpen(true);
      }
    }
  }, [initialImageUrl, images]);

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          No images shared yet
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Images shared in this conversation will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Enhanced Image Gallery Grid */}
      <div className={`${compact ? '' : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50 shadow-sm'} ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Shared Images
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {images.length} image{images.length !== 1 ? 's' : ''} • Tap to view
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-lg"
              onClick={() => handleImageClick(image)}
            >
              <Image
                src={image.url}
                alt={image.caption || 'Shared image'}
                fill
                className="object-cover"
                sizes={compact ? "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" : "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"}
              />
              
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Image info on hover */}
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-white text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" />
                    <span className="font-medium truncate">{image.senderName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(image.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Image number badge */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full font-medium">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Modal Gallery */}
      {isModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleCloseModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-5xl max-h-full w-full">
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-all duration-200 shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-all duration-200 shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-all duration-200 shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image */}
            <div
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.caption || 'Shared image'}
                width={1200}
                height={800}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                priority
              />
            </div>

            {/* Enhanced Image info and actions */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedImage.senderName}</p>
                        <p className="text-sm opacity-80 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(selectedImage.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {selectedImage.caption && (
                      <p className="text-sm opacity-90 bg-white/10 rounded-lg p-2 mt-2">
                        {selectedImage.caption}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(selectedImage.url, `image-${selectedImage.messageId}.jpg`);
                      }}
                      className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(selectedImage.url);
                      }}
                      className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200"
                      title="Share"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Image counter */}
            {images.length > 1 && (
              <div className="absolute top-6 left-6 z-10 px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-full text-sm font-medium shadow-lg">
                {images.findIndex(img => img.id === selectedImage.id) + 1} of {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}; 