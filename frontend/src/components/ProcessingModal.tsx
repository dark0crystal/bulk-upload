'use client';

interface ProcessingModalProps {
  isVisible: boolean;
  message: string;
  progress?: number;
}

export default function ProcessingModal({ isVisible, message, progress }: ProcessingModalProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-mx-4 mx-4">
        <div className="text-center">
          {/* Spinner */}
          <div className="mx-auto mb-6 w-16 h-16">
            <div className="relative">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
          </div>

          {/* Message */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Images
          </h3>
          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {/* Progress Bar (if progress is provided) */}
          {typeof progress === 'number' && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          <p className="text-sm text-gray-500">
            Please wait while we process your images...
          </p>
        </div>
      </div>
    </div>
  );
}