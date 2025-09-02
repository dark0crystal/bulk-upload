'use client';

import { useState, useRef } from 'react';
import { Project } from '../types';

interface InputSectionProps {
  onCreateProject: (data: any) => Promise<Project>;
  onParseInput: (projectId: string, data: any) => Promise<any>;
  currentProject: Project | null;
}

export default function InputSection({ onCreateProject, onParseInput, currentProject }: InputSectionProps) {
  const [rawText, setRawText] = useState('');
  const [inputImages, setInputImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputImagesRef = useRef<HTMLInputElement>(null);

  const handleInputImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setInputImages(Array.from(e.target.files));
    }
  };


  const removeInputImage = (index: number) => {
    setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!rawText.trim() && inputImages.length === 0) {
      setError('Please enter product names or upload images with product names.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let project = currentProject;
      
      if (!project) {
        // Create new project
        project = await onCreateProject({
          name: 'Bulk Product Processing',
          rawText: rawText.trim(),
          inputImages,
        });
      }

      if (project) {
        // Parse input
        await onParseInput(project.id, {
          rawText: rawText.trim(),
          images: inputImages,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Input Product Information
        </h2>

        {/* Raw Text Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Product Names (one per line or comma-separated)
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Enter product names like:
iPhone 15 Pro
Samsung Galaxy S24
MacBook Air M3
...or comma-separated: iPhone 15, Samsung Galaxy, MacBook Air"
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Input Images Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Upload Images with Product Names (optional)
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => inputImagesRef.current?.click()}
          >
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>Click to select images or drag and drop</p>
              <p className="text-sm">PNG, JPG, WEBP up to 10MB each</p>
            </div>
          </div>
          <input
            ref={inputImagesRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputImagesChange}
            className="hidden"
          />
          
          {/* Display selected input images */}
          {inputImages.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Selected Images:</p>
              <div className="flex flex-wrap gap-2">
                {inputImages.map((file, index) => (
                  <div key={index} className="relative bg-gray-100 px-3 py-1 rounded-full text-sm">
                    {file.name}
                    <button
                      onClick={() => removeInputImage(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || (!rawText.trim() && inputImages.length === 0)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </div>
          ) : (
            'Parse Products & Continue'
          )}
        </button>
      </div>
    </div>
  );
}