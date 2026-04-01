'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { popupService } from '@/services/business/user/PopupService';
import { Popup } from '@/types/foundation/banner';
import Image from 'next/image';

export function PopupManager() {
 const [activePopups, setActivePopups] = useState<Popup[]>([]);
 const [visiblePopupIds, setVisiblePopupIds] = useState<string[]>([]);

 useEffect(() => {
 async function fetchPopups() {
 try {
 const popups = await popupService.getActivePopups();
 // ?„í„°ë§? "?¤ëŠ˜ ?˜ë£¨ ë³´ì? ?Šê¸°" ì²´í¬???ì—… ?œì™¸
 const filteredPopups = (popups || []).filter(popup => {
 const expireDate = localStorage.getItem(`popup_hide_${popup.popupId}`);
 if (expireDate) {
 const now = new Date().getTime();
 if (now < parseInt(expireDate)) {
 return false;
 }
 localStorage.removeItem(`popup_hide_${popup.popupId}`);
 }
 return true;
 });

 setActivePopups(filteredPopups);
 setVisiblePopupIds(filteredPopups.map(p => p.popupId));
 } catch {
 console.error('Failed to fetch popups:', error);
 }
 }
 fetchPopups();
 }, []);

 const closePopup = (id: string) => {
 setVisiblePopupIds(prev => prev.filter(popupId => popupId !== id));
 };

 const closePopupForDay = (id: string) => {
 const expireTime = new Date().getTime() + 24 * 60 * 60 * 1000;
 localStorage.setItem(`popup_hide_${id}`, expireTime.toString());
 closePopup(id);
 };

 if (visiblePopupIds.length === 0) return null;

 return (
 <>
 {activePopups.map((popup, idx) => {
 if (!visiblePopupIds.includes(popup.popupId)) return null;

 return (
 <div
 key={`popup-${popup.popupId}-${idx}`}
 className="fixed z-50 bg-white shadow-2xl rounded-xl overflow-hidden border animate-in zoom-in duration-300"
 style={{
 top: `${popup.popupHlc}px`,
 left: `${popup.popupWlc}px`,
 width: `${popup.popupWSize}px`,
 height: `${popup.popupHSize}px`,
 }}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
 <span className="text-sm font-bold truncate">{popup.popupTitleNm}</span>
 <button
 onClick={() => closePopup(popup.popupId)}
 className="p-1 hover:bg-muted rounded-full transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 {/* Content */}
 <div className="relative w-full h-[calc(100%-80px)] overflow-auto">
 {/* ?ì—… ?´ìš©??HTML?´ê±°???´ë?ì§€?????ˆìŒ. ?¬ê¸°?œëŠ” ?´ë?ì§€ë¡?ê°€?•í•˜ê±°ë‚˜ iframe ?¬ìš© ê°€??*/}
 <div className="relative w-full min-h-[300px] h-full">
 <Image
 src={popup.fileUrl || '/api/placeholder/400/300'}
 alt={popup.popupTitleNm}
 fill
 className="object-contain"
 />
 </div>
 </div>

 {/* Footer */}
 <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-100 flex items-center justify-between px-4 border-t">
 <button
 onClick={() => closePopupForDay(popup.popupId)}
 className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-medium"
 >
 ?¤ëŠ˜ ?˜ë£¨ ë³´ì? ?Šê¸°
 </button>
 <button
 onClick={() => closePopup(popup.popupId)}
 className="text-[11px] font-bold text-slate-700 hover:text-black"
 >
 ?«ê¸°
 </button>
 </div>
 </div>
 );
 })}
 </>
 );
}
