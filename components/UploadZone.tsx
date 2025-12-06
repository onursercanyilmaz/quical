import React, { useRef, useState, useEffect } from 'react';
import { Upload, ImageIcon, ClipboardPaste } from 'lucide-react';

interface UploadZoneProps {
  onImageSelected: (base64: string) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1];
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Handle paste from clipboard
  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  };

  // Handle paste button click
  const handlePasteClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering file input click
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], 'pasted-image.png', { type: imageType });
          processFile(file);
          break;
        }
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
          ? 'border-black bg-gray-50'
          : 'border-gray-300 hover:border-black hover:bg-gray-50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        className="hidden"
        accept="image/*"
      />

      <div className="flex flex-col items-center justify-center space-y-5">
        <div className={`p-4 rounded-full transition-colors duration-200 ${isDragging ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Upload Screenshot</h3>
          <p className="text-sm text-gray-500 mt-2">Drag & drop, click to browse, or <span className="font-medium">Ctrl+V</span> to paste</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <ImageIcon className="w-3 h-3" />
            <span>PNG, JPG, WebP</span>
          </div>
          <button
            onClick={handlePasteClick}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 border border-gray-200"
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