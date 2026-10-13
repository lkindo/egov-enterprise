'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SERVER_MAX_FILE_SIZE_MB } from '@/lib/attachments/server-upload-limits';
import {
  getBoardMediaKind,
  isBoardMediaReference,
  type BoardMediaAttachment,
  type BoardMediaReference,
} from '@/lib/attachments/board-media';

export interface BoardMediaProps {
  reference: BoardMediaReference;
  atchFileSn?: number | null;
  attachments?: readonly BoardMediaAttachment[];
  pendingFiles?: readonly File[];
}

type LoadState = { status: 'idle' | 'loading' | 'error'; src?: never }
  | { status: 'ready'; src: string };

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp',
  mp4: 'video/mp4', webm: 'video/webm',
};

function findAttachment(reference: Pick<BoardMediaReference, 'name' | 'kind'>, group: number, attachments: readonly BoardMediaAttachment[]) {
  const matches = attachments.filter(file => file.orignlFileNm === reference.name);
  const match = matches.length === 1 ? matches[0] : null;
  const extension = reference.name.slice(reference.name.lastIndexOf('.') + 1);
  return match && match.atchFileSn === group && Number.isSafeInteger(match.fileSn) && match.fileSn >= 0
    && typeof match.fileExtsn === 'string' && match.fileExtsn.toLowerCase() === extension
    && getBoardMediaKind(match.orignlFileNm) === reference.kind
    ? match : null;
}

export function BoardMedia(props: BoardMediaProps) {
  // Replacing/removing a matching attachment also hides the previous bytes before effects run.
  const attachmentSnapshot = props.attachments === undefined ? 'lookup' : props.attachments
    .filter(file => file.orignlFileNm === props.reference.name)
    .map(file => `${file.atchFileSn}:${file.fileSn}:${file.fileExtsn}`).join(',');
  const pendingSnapshot = props.pendingFiles?.filter(file => file.name === props.reference.name)
    .map(file => `${file.size}:${file.lastModified}`).join(',') ?? '';
  return <BoardMediaView key={`${props.atchFileSn ?? 'pending'}:${props.reference.kind}:${props.reference.name}:${attachmentSnapshot}:${pendingSnapshot}`} {...props} />;
}

function BoardMediaView({ reference, atchFileSn, attachments, pendingFiles }: BoardMediaProps) {
  const { name, kind } = reference;
  const label = reference.label.trim() || (kind === 'image' ? '첨부 이미지' : '첨부 영상');
  const [requested, setRequested] = useState(reference.kind === 'image');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: reference.kind === 'image' ? 'loading' : 'idle' });
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const pendingMatches = pendingFiles?.filter(file => file.name === reference.name) ?? [];
  const pending = pendingMatches.length === 1 ? pendingMatches[0] : undefined;
  const pendingCount = pendingMatches.length;
  const resolved = attachments && atchFileSn ? findAttachment(reference, atchFileSn, attachments) : null;
  const attachmentId = resolved?.fileSn;
  const hasAttachmentList = attachments !== undefined;
  const validReference = isBoardMediaReference(reference);

  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    let active = true;
    const load = async () => {
      try {
        if (!validReference || pendingCount > 1) throw new Error('Invalid media reference');
        let blob: Blob;
        if (pending) {
          blob = pending;
        } else {
          if (!atchFileSn || !Number.isSafeInteger(atchFileSn) || atchFileSn < 1) throw new Error('Missing attachment group');
          const { fileService } = await import('@/services/foundation/file/FileService');
          const config = { signal: controller.signal, suppressErrorToast: true } as const;
          const fileSn = hasAttachmentList ? attachmentId : findAttachment({ name, kind }, atchFileSn,
            await fileService.getFileList(atchFileSn, config))?.fileSn;
          if (fileSn === undefined) throw new Error('Missing or ambiguous attachment');
          blob = await fileService.fetchBlob(atchFileSn, fileSn, config);
        }
        if (!active) return;
        if (blob.size === 0 || blob.size > SERVER_MAX_FILE_SIZE_MB * 1024 * 1024) throw new Error('Invalid media size');
        const extension = name.slice(name.lastIndexOf('.') + 1);
        // Existing download responses use octet-stream; the validated file extension supplies the media type.
        objectUrl = URL.createObjectURL(new Blob([blob], { type: MIME_TYPES[extension] }));
        setState({ status: 'ready', src: objectUrl });
      } catch {
        if (active) setState({ status: 'error' });
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requested, attempt, validReference, pending, pendingCount, atchFileSn, attachmentId,
    hasAttachmentList, name, kind]);

  const retry = () => {
    setState({ status: 'loading' });
    setPlaybackFailed(false);
    setRequested(true);
    setAttempt(value => value + 1);
  };

  return (
    <div className="not-prose my-2 space-y-2 rounded-md border border-border bg-muted/30 p-3" role="group" aria-label={label}>
      {state.status === 'idle' && <Button type="button" variant="outline" onClick={retry}>영상 불러오기</Button>}
      {state.status === 'loading' && <p role="status" className="text-sm text-muted-foreground">{label} 불러오는 중…</p>}
      {(state.status === 'error' || playbackFailed) && (
        <div className="space-y-2">
          <p role="status" className="text-sm text-muted-foreground">{label} 파일을 표시할 수 없습니다.</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>다시 시도</Button>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          {!playbackFailed && (reference.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element -- Authenticated/local bytes are owned object URLs, not image-optimizer inputs.
            <img src={state.src} alt={label} className="m-0 h-auto max-w-full rounded" onError={() => setPlaybackFailed(true)} />
          ) : (
            <video src={state.src} controls playsInline preload="metadata" aria-label={label} className="h-auto max-w-full rounded" onError={() => setPlaybackFailed(true)} />
          ))}
          <a href={state.src} download={reference.label.trim() || reference.name} className="inline-block text-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">파일 내려받기</a>
        </>
      )}
    </div>
  );
}
