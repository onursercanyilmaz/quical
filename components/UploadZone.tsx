import React, { useRef, useState, useEffect } from 'react';
import { Upload, ImageIcon, ClipboardPaste, Camera } from 'lucide-react';

interface UploadZoneProps {
  onImagesSelected: (base64Images: string[]) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onImagesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const base64Promises = imageFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
    });

    const base64Images = await Promise.all(base64Promises);
    onImagesSelected(base64Images);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Handle camera capture
  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  // Handle paste from clipboard
  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  };

  // Handle paste button click
  const handlePasteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering file input click
    try {
      const clipboardItems = await navigator.clipboard.read();
      const imageFiles: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'pasted-image.png', { type: imageType });
          imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        processFiles(imageFiles);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  useEffect(() => {
    // Add global paste listener
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  return (
    <div
      className={`relative border border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer
        ${isDragging
          ? 'border-black bg-gray-50 dark:border-white dark:bg-gray-800'
          : 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      {/* File upload input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden"
        accept="image/*"
        multiple
      />

      {/* Camera capture input */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileInput}
        className="hidden"
        accept="image/*"
        capture="environment"
      />

      <div className="flex flex-col items-center justify-center space-y-5">
        <div className={`p-4 rounded-full transition-colors duration-200 ${isDragging ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload or Take Photo</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Drag & drop, click to browse, or <span className="font-medium">Ctrl+V</span> to paste</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You can select multiple images</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ImageIcon className="w-3 h-3" />
            <span>PNG, JPG, WebP</span>
          </div>
          <button
            onClick={handleCameraClick}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          >
            <Camera className="w-3 h-3" />
            Take Photo
          </button>
          <button
            onClick={handlePasteClick}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          >
            <ClipboardPaste className="w-3 h-3" />
            Paste Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;