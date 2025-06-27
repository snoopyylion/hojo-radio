import React, { useRef } from 'react';
import { X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  onClose: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = '*',
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selected = Array.from(files).filter(file => file.size <= maxSize);
    if (selected.length > maxFiles) {
      alert(`You can upload up to ${maxFiles} files.`);
      return;
    }

    onFileSelect(selected);
    onClose();
  };

  return (
    <div className="relative bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xl w-72 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Upload File
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#EF3866] rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
      >
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Click to select
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Max {maxFiles} files, up to {Math.floor(maxSize / 1024 / 1024)}MB each
        </span>
        <input
          id="file-upload"
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </label>

      <button
        onClick={onClose}
        className="w-full mt-4 text-sm text-center text-red-500 hover:underline"
      >
        Cancel
      </button>
    </div>
  );
};

export default FileUpload;
