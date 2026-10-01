'use client';

import DOMPurify from 'isomorphic-dompurify';

export default function SanitizedFaqAnswer({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-[length:var(--font-size-body)] leading-relaxed text-foreground"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}
