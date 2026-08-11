'use client';

import React, { useRef, useState, ChangeEvent, DragEvent, ReactNode } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  label?: string;
  helperText?: string;
  icon?: ReactNode;
  accept?: string;
}

interface FilePreview {
  file: File;
  preview: string;
  error?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

function FileUpload({
  onFilesSelected,
  acceptedFileTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx'],
  maxFileSize = 5 * 1024 * 1024,
  maxFiles = 5,
  multiple = true,
  label = 'Upload Files',
  helperText,
  icon,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File size exceeds ${formatFileSize(maxFileSize)}`;
    }

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const hasValidType = acceptedFileTypes.some((type) => {
      if (type.endsWith('/*')) {
        const baseType = type.replace('/*', '');
        return fileType.startsWith(baseType);
      }
      return fileType === type || fileName.endsWith(type);
    });

    if (!hasValidType) {
      return `File type not accepted. Accepted types: ${acceptedFileTypes.join(', ')}`;
    }

    return null;
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    const newPreviews: FilePreview[] = [];
    const validFiles: File[] = [];

    if (previews.length + fileArray.length > maxFiles && !multiple) {
      alert(`Maximum ${maxFiles} file(s) allowed`);
      return;
    }

    fileArray.forEach((file) => {
      const error = validateFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newPreviews.push({
            file,
            preview: e.target?.result as string,
            error,
          });
          setPreviews((prev) => [...prev, ...newPreviews]);
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push({
          file,
          preview: '',
          error,
        });
        setPreviews((prev) => [...prev, ...newPreviews]);
      }

      if (!error) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative w-full p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleInputChange}
          accept={acceptedFileTypes.join(',')}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          {icon ? (
            <div className="mb-3 text-4xl">{icon}</div>
          ) : (
            <svg
              className="mb-3 w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          )}

          <p className="text-sm font-medium text-gray-900">
            Drag and drop files here, or click to select
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max {maxFiles} file(s), {formatFileSize(maxFileSize)} each
          </p>
        </div>
      </div>

      {helperText && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}

      {previews.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Uploaded Files ({previews.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {previews.map((item, index) => (
              <div
                key={index}
                className="relative group border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {item.error ? (
                  <div className="bg-red-50 p-4 h-32 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xs text-red-600 font-medium">
                        Error
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        {item.error}
                      </p>
                    </div>
                  </div>
                ) : item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="bg-gray-100 p-4 h-32 flex items-center justify-center">
                    <div className="text-center">
                      <svg
                        className="w-8 h-8 text-gray-400 mx-auto mb-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                        />
                        <path
                          fillRule="evenodd"
                          d="M3 4a2 2 0 00-2 2v4a1 1 0 001 1h12a1 1 0 001-1V6a2 2 0 00-2-2H3zm11.378 2.879a.75.75 0 00-.531-1.007A.75.75 0 0013 5.75v6.5a.75.75 0 001.5 0v-6.5a.75.75 0 00-.622-.871z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-xs text-gray-600">
                        {item.file.type.split('/')[1]}
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-colors"
                    aria-label="Remove file"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-3 bg-white border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(item.file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

FileUpload.displayName = 'FileUpload';

export default FileUpload;
