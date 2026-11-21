'use client';

import { BoardRichTextContent } from '@/components/ui/BoardRichTextContent';
import { cn } from '@/lib/utils';
import { RICH_TEXT_CONTENT_CLASSES, RICH_TEXT_TABLE_CLASSES } from '@/lib/rich-text-styles';

export default function SanitizedFaqAnswer({ html, atchFileSn }: { html: string; atchFileSn?: number | null }) {
  return (
    <BoardRichTextContent
      className={cn(
        RICH_TEXT_CONTENT_CLASSES,
        'text-[length:var(--font-size-body)] leading-relaxed',
        RICH_TEXT_TABLE_CLASSES,
      )}
      html={html}
      atchFileSn={atchFileSn}
    />
  );
}
