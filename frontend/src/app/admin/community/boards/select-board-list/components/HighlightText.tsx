import React from 'react';

export const HighlightText = ({ text, highlight }: { text: string | undefined; highlight: string }) => {
  if (!text) return null;
  if (!highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};
