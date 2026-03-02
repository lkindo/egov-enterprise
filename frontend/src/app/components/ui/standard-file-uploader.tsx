'use client';

import React, { useState } from 'react';
import { Upload, X, FileIcon, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardFileUploaderProps {
  onFilesChange?: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  name?: string;
  className?: string;
}

export function StandardFileUploader({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  name = "files",
  className
}: StandardFileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const updatedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
      setSelectedFiles(updatedFiles);
      onFilesChange?.(updatedFiles);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-muted/5 hover:bg-muted/10 transition-colors border-muted-foreground/20">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
          <p className="mb-1 text-sm text-foreground font-semibold">클릭하거나 파일을 드래그하세요</p>
          <p className="text-xs text-muted-foreground">최대 {maxFiles}개, 파일당 {maxSizeMB}MB 제한</p>
        </div>
        <input name={name} type="file" className="hidden" multiple onChange={handleFileChange} />
      </label>

      {selectedFiles.length > 0 && (
        <ul className="grid gap-2">
          {selectedFiles.map((file, idx) => (
            <li key={`file-${idx}`} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon size={18} className="text-primary shrink-0" />
                <span className="text-sm truncate font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`파일 삭제: ${file.name}`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
