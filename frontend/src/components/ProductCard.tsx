'use client';

import { useState, useRef } from 'react';
import { ProductCard, ProjectStatus } from '../types';

interface ProductCardProps {
  card: ProductCard;
  projectStatus: ProjectStatus;
  onRefresh: () => Promise<void>;
}

export default function ProductCardComponent({ card, projectStatus, onRefresh }: ProductCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Select an image option
  const handleSelectImage = async (optionId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/cards/${card.id}/select-image/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_option_id: optionId }),
      });

      if (!response.ok) throw new Error('Failed to select image');
      
      await onRefresh();
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  // Upload custom image
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`http://localhost:8000/api/cards/${card.id}/upload-image/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');
      
      await onRefresh();
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = () => {
    switch (card.status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'images_fetched': return 'bg-blue-100 text-blue-700';
      case 'image_selected': return 'bg-green-100 text-green-700';
      case 'image_uploaded': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = () => {
    switch (card.status) {
      case 'pending': return 'Pending';
      case 'images_fetched': return 'Images Ready';
      case 'image_selected': return 'Image Selected';
      case 'image_uploaded': return 'Custom Image';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return card.status;
    }
  };

  const hasSelectedImage = card.selected_image_url || card.uploaded_image;
  const canSelectImages = (card.status === 'images_fetched' || card.status === 'image_selected') && card.image_options.length > 0;
  const canUpload = projectStatus === 'generated';

  // Get the currently selected/uploaded image for main display
  const getMainImage = () => {
    if (card.uploaded_image) return card.uploaded_image;
    if (card.selected_image_url) return card.selected_image_url;
    if (card.image_options.length > 0) {
      const selectedOption = card.image_options.find(option => option.is_selected);
      if (selectedOption) return selectedOption.original_url;
      return card.image_options[0].original_url; // Fallback to first option
    }
    return null;
  };

  const mainImage = getMainImage();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Card Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2 truncate" title={card.product_name}>
              {card.product_name}
            </h3>
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {card.image_options.length > 0 && (
                <span className="text-sm text-gray-500">
                  {card.image_options.length} image{card.image_options.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          </div>
          
          {/* Final Image Download - Top Right */}
          {card.final_image_url && (
            <a
              href={card.final_image_url}
              download={`${card.product_name}_processed.png`}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Download final processed image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </a>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Main Image Display */}
        {mainImage ? (
          <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden mb-6" style={{ aspectRatio: '16/10' }}>
            <img
              src={mainImage}
              alt={card.product_name}
              className="w-full h-full object-contain p-4"
              onError={(e) => {
                console.log('Main image failed to load:', e.currentTarget.src);
                e.currentTarget.style.display = 'none';
              }}
            />
            
            {/* Status Badges */}
            {hasSelectedImage && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {card.uploaded_image ? 'Custom Upload' : 'Selected'}
              </div>
            )}
            
            {card.status === 'completed' && (
              <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                ✓ Processed
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mb-6" style={{ aspectRatio: '16/10' }}>
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-600 mb-2">No image selected</p>
              <p className="text-sm text-gray-500">
                {card.status === 'pending' ? 'Generate images first' : 'Choose from options below or upload custom image'}
              </p>
            </div>
          </div>
        )}

        {/* Image Carousel - Horizontal Scrolling */}
        {card.image_options.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Available Images</h4>
              <span className="text-xs text-gray-500">Scroll horizontally →</span>
            </div>
            
            <div className="relative">
              <div 
                className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollBehavior: 'smooth'
                }}
              >
                {card.image_options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectImage(option.id)}
                    className={`relative group flex-shrink-0 border-2 rounded-lg overflow-hidden transition-all hover:scale-105 ${
                      option.is_selected 
                        ? 'border-green-500 ring-2 ring-green-200 shadow-lg' 
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                    style={{ width: '120px', height: '90px' }}
                    title={`Image from ${option.source}`}
                  >
                    <img
                      src={option.thumbnail_url || option.original_url}
                      alt={`Option ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('Thumbnail failed to load:', e.currentTarget.src);
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTIwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNGMEYwRjAiLz48dGV4dCB4PSI2MCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk5OTk5OSI+Tm8gaW1hZ2U8L3RleHQ+PC9zdmc+';
                      }}
                    />
                    
                    {/* Source Badge */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 truncate text-center">
                      {option.source}
                    </div>
                    
                    {/* Selection Indicator */}
                    {option.is_selected && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                        <div className="bg-green-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Upload Button */}
          {canUpload && (
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={isUploading}
              className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 text-blue-700 font-medium py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {isUploading ? 'Uploading...' : 'Upload Custom Image'}
            </button>
          )}
          
          {/* Status Message */}
          {!canSelectImages && !canUpload && card.status === 'pending' && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">Generate images first to see options</p>
            </div>
          )}
          
          {card.status === 'completed' && !card.final_image_url && (
            <div className="text-center py-4 text-orange-600 bg-orange-50 rounded-lg">
              <p className="text-sm font-medium">Processing completed but final image not available</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={handleUploadImage}
        className="hidden"
      />
    </div>
  );
}