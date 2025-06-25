// components/messaging/FileUpload.tsx
import React, { useRef } from 'react';

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
    <div className="bg-white shadow-md border p-3 rounded-md z-50">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="block w-full text-sm text-gray-700"
      />
      <button
        onClick={onClose}
        className="mt-2 text-sm text-red-500 hover:underline"
      >
        Cancel
      </button>
    </div>
  );
};

export default FileUpload;
