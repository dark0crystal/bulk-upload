'use client';

import { useState } from 'react';
import { Project, ProjectStatus } from '../types';
import ProductCardComponent from './ProductCard';

interface ProductCardsGridProps {
  project: Project;
  onGenerate: () => Promise<any>;
  onSaveAndProcess: () => Promise<any>;
  onRefresh: () => Promise<void>;
  status: ProjectStatus;
}

export default function ProductCardsGrid({ 
  project, 
  onGenerate, 
  onSaveAndProcess, 
  onRefresh, 
  status 
}: ProductCardsGridProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      await onGenerate();
    } catch (error) {
      console.error('Generate failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAndProcess = async () => {
    try {
      setIsProcessing(true);
      await onSaveAndProcess();
    } catch (error) {
      console.error('Process failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };


  // Can generate if project is parsed OR if there are cards that need images
  const hasCardsNeedingImages = project.cards.some(card => 
    card.status === 'pending' || 
    (card.status === 'images_fetched' && card.image_options.length === 0) ||
    card.image_options.length === 0
  );
  
  const canGenerate = status === 'parsed' || 
    ((['generated', 'completed'].includes(status)) && hasCardsNeedingImages);
  
  const canProcess = (status === 'generated' || status === 'completed') && 
    project.cards.some(card => 
      card.status === 'image_selected' || card.status === 'image_uploaded'
    );

  return (
    <div className="w-[88vw] mx-auto">
      {/* Header with Action Buttons */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Product Cards ({project.cards.length})
            </h2>
            <p className="text-gray-600">
              {status === 'parsed' && 'Products parsed successfully. Click Generate to search for images.'}
              {status === 'generated' && hasCardsNeedingImages && 
                'Some cards need images. Click Generate for missing images, or Save to process selected ones.'}
              {status === 'generated' && !hasCardsNeedingImages && 
                'Images loaded. Select or upload images for each product, then Save to process.'}
              {status === 'completed' && hasCardsNeedingImages && 
                'Processing completed! Some cards still need images - click Generate for remaining ones.'}
              {status === 'completed' && !hasCardsNeedingImages && 
                'Processing completed! All images have been processed.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Generate Button */}
            {canGenerate && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  hasCardsNeedingImages && status !== 'parsed' 
                    ? 'Generate Missing Images' 
                    : 'Generate Images'
                )}
              </button>
            )}


            {/* Save & Process Button */}
            {canProcess && (
              <button
                onClick={handleSaveAndProcess}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Save & Process All'
                )}
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

      </div>

      {/* Product Cards Grid - Two columns on md+ screens, single column on smaller screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {project.cards.map((card) => (
          <ProductCardComponent
            key={card.id}
            card={card}
            projectStatus={status}
            onRefresh={onRefresh}
          />
        ))}
      </div>

      {/* Empty State */}
      {project.cards.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Go back to input more product names or images.</p>
        </div>
      )}
    </div>
  );
}