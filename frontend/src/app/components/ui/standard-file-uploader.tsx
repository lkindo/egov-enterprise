'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, X, FileIcon, CheckCircle2, AlertCircle, Loader2, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
// [2026-09-20] framer-motion 을 걷었다 — 드롭존 확대·아이콘 바운스·첨부 행 진입 모션은 첨부 결과 도달만 늦춘다(카탈로그 §3).
import { toast } from 'sonner';

/** FileService와 tb_file_detail.orgnl_file_nm의 원본 파일명 상한. */
const MAX_FILENAME_LENGTH = 300;

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

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
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
  const fallbackIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const clearFallbackUpload = useCallback((fileId: string) => {
    const interval = fallbackIntervals.current.get(fileId);
    if (interval !== undefined) {
      clearInterval(interval);
      fallbackIntervals.current.delete(fileId);
    }
  }, []);

  useEffect(() => {
    const intervals = fallbackIntervals.current;
    return () => {
      intervals.forEach(interval => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  // fallback 시뮬레이터 (onUpload가 없는 경우 가짜 게이지 구동)
  const simulateUpload = useCallback((fileId: string) => {
    clearFallbackUpload(fileId);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 30;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        fallbackIntervals.current.delete(fileId);
        setFileStates(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f
        ));
      } else {
        setFileStates(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: currentProgress } : f
        ));
      }
    }, 400);
    fallbackIntervals.current.set(fileId, interval);
  }, [clearFallbackUpload]);

  // 실제 비동기 업로드 수행 핸들러
  const performActualUpload = useCallback(async (fileState: FileState) => {
    if (!onUpload) return;
    
    setFileStates(prev => prev.map(f => 
      f.id === fileState.id ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      await onUpload(fileState.file, (p) => {
        setFileStates(prev => prev.map(f => 
          f.id === fileState.id ? { ...f, progress: clampProgress(p) } : f
        ));
      });
      setFileStates(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, progress: 100, status: 'completed' } : f
      ));
    } catch {
      setFileStates(prev => prev.map(f => 
        f.id === fileState.id ? { ...f, status: 'error' } : f
      ));
      toast.error(`${fileState.file.name} 업로드에 실패했습니다.`);
    }
  }, [onUpload]);

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.name.length > MAX_FILENAME_LENGTH) {
        toast.error('파일명은 확장자를 포함해 300자 이내로 지정해 주세요.');
        return false;
      }
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
      return {
        file,
        progress: 0,
        status: isAutoUpload ? ('uploading' as const) : ('pending' as const),
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
    clearFallbackUpload(id);
    const updatedStates = fileStates.filter(fs => fs.id !== id);
    setFileStates(updatedStates);
    onFilesChange?.(updatedStates.map(fs => fs.file));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Drop Zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-4 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-background hover:bg-muted"
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <Upload size={20} aria-hidden="true" className={cn("shrink-0", isDragging ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[length:var(--font-size-body)] font-medium text-foreground">
            {isDragging ? "여기에 파일을 놓으세요" : "클릭하거나 파일을 이곳에 드래그하세요"}
          </p>
          <p className="text-xs text-muted-foreground">
            최대 {maxFiles}개 파일 / {maxSizeMB}MB 제한
          </p>
        </div>
        <input name={name} type="file" aria-label="파일 첨부 선택" className="sr-only" multiple accept={accept} onChange={handleFileChange} />
      </label>

      {/* File List */}
      <div className="space-y-1">
        {fileStates.map((fs) => (
          <div
            key={fs.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded",
                fs.status === 'completed' ? "bg-success/10 text-success-emphasis" : "bg-muted text-muted-foreground"
              )}>
                {fs.status === 'uploading' ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> :
                 fs.status === 'pending' ? <Hourglass size={16} aria-hidden="true" /> : <FileIcon size={16} aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[length:var(--font-size-body)] font-medium text-foreground">
                    {fs.file.name}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {(fs.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                {fs.status === 'pending' ? (
                  <p className="text-xs leading-tight text-muted-foreground">
                    첨부 대기 중 (폼 제출 시 최종 업로드됨)
                  </p>
                ) : (
                  <div
                    role="progressbar"
                    aria-label={`${fs.file.name} 업로드 진행률`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(fs.progress)}
                    className="relative h-1 w-full overflow-hidden rounded bg-muted"
                  >
                    <div
                      style={{ width: `${fs.progress}%` }}
                      className={cn(
                        "absolute inset-y-0 left-0 rounded",
                        fs.status === 'completed' ? "bg-success"
                          : fs.status === 'error' ? "bg-destructive" : "bg-primary"
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {fs.status === 'completed' ? (
                <CheckCircle2 size={16} aria-hidden="true" className="text-success-emphasis" />
              ) : fs.status === 'error' ? (
                <AlertCircle size={16} aria-hidden="true" className="text-destructive-emphasis" />
              ) : null}
              <button
                type="button"
                aria-label={`${fs.file.name} 첨부 파일 삭제`}
                onClick={() => removeFile(fs.id)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-emphasis focus-visible:opacity-100"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
