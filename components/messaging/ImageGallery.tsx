'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Download, Share2, Image as ImageIcon } from 'lucide-react';
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
  conversationId,
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
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No images shared yet
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Image Gallery Grid */}
      <div className={`${compact ? '' : 'bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'} ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shared Images ({images.length})
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Click to view
            </span>
          </div>
        )}
        
        <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'}`}>
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer group hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(image)}
            >
              <Image
                src={image.url}
                alt={image.caption || 'Shared image'}
                fill
                className="object-cover"
                sizes={compact ? "(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw" : "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Gallery */}
      {isModalOpen && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={handleCloseModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
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
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image */}
            <div
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.url}
                alt={selectedImage.caption || 'Shared image'}
                width={800}
                height={600}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                priority
              />
            </div>

            {/* Image info and actions */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="text-white">
                <p className="font-medium">{selectedImage.senderName}</p>
                {selectedImage.caption && (
                  <p className="text-sm opacity-80">{selectedImage.caption}</p>
                )}
                <p className="text-xs opacity-60">
                  {new Date(selectedImage.timestamp).toLocaleDateString()}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(selectedImage.url, `image-${selectedImage.messageId}.jpg`);
                  }}
                  className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(selectedImage.url);
                  }}
                  className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black bg-opacity-50 text-white rounded-full text-sm">
                {images.findIndex(img => img.id === selectedImage.id) + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}; 