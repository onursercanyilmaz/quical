import React, { useRef, useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';

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
          <p className="text-sm text-gray-500 mt-2">Drag & drop or click to browse</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ImageIcon className="w-3 h-3" />
          <span>PNG, JPG, WebP</span>
        </div>
      </div>
    </div>
  );
};

export default UploadZone;