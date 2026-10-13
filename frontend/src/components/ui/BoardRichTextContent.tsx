'use client';

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  readBoardMediaReference,
  sanitizeBoardRichText,
  type BoardMediaAttachment,
  type BoardMediaReference,
} from '@/lib/attachments/board-media';
import { BoardMedia } from './BoardMedia';

interface BoardRichTextContentProps {
  html: string;
  className?: string;
  atchFileSn?: number | null;
  attachments?: readonly BoardMediaAttachment[];
}

export function BoardRichTextContent(props: BoardRichTextContentProps) {
  const sanitized = useMemo(() => sanitizeBoardRichText(props.html), [props.html]);
  return <RichTextBody key={sanitized} {...props} html={sanitized} />;
}

function RichTextBody({ html, className, atchFileSn, attachments }: BoardRichTextContentProps) {
  // Keep the innerHTML prop stable so a portal update cannot replace its DOM targets.
  const markup = useMemo(() => ({ __html: html }), [html]);
  const [targets, setTargets] = useState<{ element: Element; reference: BoardMediaReference }[]>([]);
  const attachBody = useCallback((body: HTMLDivElement | null) => {
    if (!body) return;
    const mediaTargets: { element: Element; reference: BoardMediaReference }[] = [];
    for (const figure of body.querySelectorAll('figure[data-board-file]')) {
      const reference = readBoardMediaReference(figure);
      if (!reference) continue;
      const element = body.ownerDocument.createElement('div');
      figure.prepend(element);
      mediaTargets.push({ element, reference });
    }
    setTargets(mediaTargets);
    return () => { mediaTargets.forEach(({ element }) => element.remove()); };
  }, []);

  return (
    <>
      <div ref={attachBody} className={className} dangerouslySetInnerHTML={markup} />
      {atchFileSn && Number.isSafeInteger(atchFileSn) && atchFileSn > 0 ? targets.map(({ element, reference }, index) => createPortal(
        <BoardMedia reference={reference} atchFileSn={atchFileSn} attachments={attachments} />,
        element,
        `${reference.name}:${index}`,
      )) : null}
    </>
  );
}
