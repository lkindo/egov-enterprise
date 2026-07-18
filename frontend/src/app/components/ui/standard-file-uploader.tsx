'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, FileIcon, CheckCircle2, AlertCircle, Loader2, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface FileState {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'pending';
  id: string;
}

interface StandardFileUploaderProps {
  onFilesChange?: (files: File[]) => void;
  onUpload?: (file: File, onProgress: (progress: number) => void) => Promise<unknown>;
  isAutoUpload?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  name?: string;
  className?: string;
}

// accept 속성(확장자/MIME)에 따른 파일 허용 여부 검사 (드래그&드롭은 브라우저 accept 필터를 우회하므로 수동 검증 필요)
function isFileTypeAccepted(file: File, accept: string): boolean {
  const normalized = (accept ?? '').trim();
  if (!normalized || normalized === '*' || normalized === '*/*') return true;

  const tokens = normalized.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  return tokens.some(token => {
    if (token === '*' || token === '*/*') return true;
    // 확장자 매칭 (예: .pdf)
    if (token.startsWith('.')) return fileName.endsWith(token);
    // MIME 그룹 매칭 (예: image/*)
    if (token.endsWith('/*')) return fileType.startsWith(token.slice(0, token.length - 1));
    // 정확한 MIME 매칭 (예: application/pdf)
    return fileType === token;
  });
}

export function StandardFileUploader({
  onFilesChange,
  onUpload,
  isAutoUpload = false,
  maxFiles = 5,
  maxSizeMB = 10,
  accept = "*",
  name = "files",
  className
}: StandardFileUploaderProps) {
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // fallback 시뮬레이터 (onUpload가 없는 경우 가짜 게이지 구동)
  const simulateUpload = useCallback((fileId: string) => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 30;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setFileStates(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f
        ));
      } else {
        setFileStates(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: currentProgress } : f
        ));
      }
    }, 400);
  }, []);

  // 실제 비동기 업로드 수행 핸들러
  const performActualUpload = useCallback(async (fileState: FileState) => {
    if (!onUpload) return;
    
    setFileStates(prev => prev.map(f => 
      f.id === fileState.id ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      await onUpload(fileState.file, (p) => {
        setFileStates(prev => prev.map(f => 
          f.id === fileState.id ? { ...f, progress: p } : f
        ));
      });
      setFileStates(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, progress: 100, status: 'completed' } : f
      ));
    } catch (e) {
      setFileStates(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'error' } : f
      ));
      toast.error(`${fileState.file.name} 업로드에 실패했습니다.`);
    }
  }, [onUpload]);

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      // 형식 검증: 드래그&드롭 파일은 input의 accept 필터를 우회하므로 여기서 직접 차단한다.
      const isTypeValid = isFileTypeAccepted(file, accept);
      if (!isTypeValid) {
        toast.error(`${file.name} 형식은 첨부할 수 없습니다.`);
        return false;
      }
      const isSizeValid = file.size <= maxSizeMB * 1024 * 1024;
      if (!isSizeValid) {
        toast.error(`${file.name} 크기가 ${maxSizeMB}MB를 초과합니다.`);
        return false;
      }
      return true;
    });

    // 개수 초과: 남은 슬롯을 넘기면 조용히 버리지 않고 사용자에게 알린 뒤 슬롯만큼만 추가한다.
    const remainingSlots = maxFiles - fileStates.length;
    if (validFiles.length > remainingSlots) {
      toast.error(`최대 ${maxFiles}개까지 첨부할 수 있습니다.`);
    }

    const newFileStates: FileState[] = validFiles.map(file => {
      const requiresInstantUpload = isAutoUpload && typeof onUpload === 'function';
      return {
        file,
        progress: 0,
        status: requiresInstantUpload ? ('uploading' as const) : ('pending' as const),
        id: Math.random().toString(36).substring(7)
      };
    }).slice(0, Math.max(0, remainingSlots));

    if (newFileStates.length > 0) {
      const updatedStates = [...fileStates, ...newFileStates];
      setFileStates(updatedStates);
      onFilesChange?.(updatedStates.map(fs => fs.file));
      
      newFileStates.forEach(fs => {
        if (isAutoUpload) {
          if (onUpload) {
            performActualUpload(fs);
          } else {
            simulateUpload(fs.id);
          }
        }
      });
      toast.success(`${newFileStates.length}개의 파일이 추가되었습니다.`);
    }
  }, [fileStates, maxFiles, maxSizeMB, accept, onFilesChange, isAutoUpload, onUpload, performActualUpload, simulateUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id: string) => {
    const updatedStates = fileStates.filter(fs => fs.id !== id);
    setFileStates(updatedStates);
    onFilesChange?.(updatedStates.map(fs => fs.file));
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Drop Zone */}
      <motion.label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden group",
          isDragging 
            ? "border-primary bg-primary/5 shadow-[0_0_40px_-10px_rgba(var(--primary),0.3)]" 
            : "border-border bg-muted/50 hover:bg-muted/50"
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
          <motion.div
            animate={isDragging ? { y: [0, -10, 0] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={cn(
              "w-16 h-11 rounded-lg flex items-center justify-center mb-4 transition-colors",
              isDragging ? "bg-primary text-white" : "bg-card text-muted-foreground shadow-sm"
            )}
          >
            <Upload size={32} />
          </motion.div>
          <p className="mb-2 text-sm text-foreground font-bold tracking-tight">
            {isDragging ? "여기에 파일을 놓으세요" : "클릭하거나 파일을 이곳에 드래그하세요"}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            최대 {maxFiles}개 파일 / {maxSizeMB}MB 제한
          </p>
        </div>
        <input name={name} type="file" className="hidden" multiple accept={accept} onChange={handleFileChange} />
        
        {/* Animated Background Pulse */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/5 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </motion.label>

      {/* File List */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {fileStates.map((fs) => (
            <motion.div
              key={fs.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="group relative overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    fs.status === 'completed' ? "bg-emerald-50 text-emerald-500" :
                    fs.status === 'pending' ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {fs.status === 'uploading' ? <Loader2 size={20} className="animate-spin" /> : 
                     fs.status === 'pending' ? <Hourglass size={20} className="animate-pulse" /> : <FileIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground truncate tracking-tight">
                        {fs.file.name}
                      </p>
                      <span className="text-xs font-bold text-muted-foreground uppercase">
                        {(fs.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    {/* Progress Bar or Pending Text */}
                    {fs.status === 'pending' ? (
                      <p className="text-xs font-bold text-muted-foreground tracking-tight leading-none pt-1">
                        첨부 대기 중 (폼 제출 시 최종 업로드됨)
                      </p>
                    ) : (
                      <div className="relative w-full h-1.5 bg-muted rounded-lg overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${fs.progress}%` }}
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-lg transition-colors",
                            fs.status === 'completed' ? "bg-emerald-500" : "bg-primary"
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center ml-4 gap-2">
                  {fs.status === 'completed' ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : fs.status === 'error' ? (
                    <AlertCircle size={18} className="text-rose-500" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeFile(fs.id)}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
