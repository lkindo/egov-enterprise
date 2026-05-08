
import React, { useState } from 'react';
import { X, ZoomIn, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ImageLightboxProps {
 src: string;
 alt?: string;
 isOpen: boolean;
 onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-[#020617]/98 animate-in fade-in duration-300">
 <div className="absolute top-4 right-4 flex gap-4">
 <button
 onClick={onClose}
 className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
 >
 <X size={24} />
 </button>
 </div>

 <div className="relative max-w-[90vw] max-h-[90vh] w-full h-[85vh]">
 <Image
 src={src}
 alt={alt || "?뺣? ?대吏"}
 fill
 className="object-contain max-w-full max-h-[85vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
 />
 {alt && (
 <div className="absolute bottom-[-2rem] left-0 right-0 text-white text-center font-medium opacity-80">
 {alt}
 </div>
 )}
 </div>
 </div>
 );
}

