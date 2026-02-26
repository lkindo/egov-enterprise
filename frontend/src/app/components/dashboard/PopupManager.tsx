'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { popupService } from '@/services/popupService';
import { Popup } from '@/types/banner';

export const PopupManager = React.memo(function PopupManager() {
  const [activePopups, setActivePopups] = useState<Popup[]>([]);
  const [visiblePopupIds, setVisiblePopupIds] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPopups() {
      try {
        const res = await popupService.getActivePopups();
        if (res.success) {
          const popups: Popup[] = res.data;
          
          // 필터링: "오늘 하루 보지 않기" 체크된 팝업 제외
          const filteredPopups = popups.filter(popup => {
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
        }
      } catch (error) {
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
      {activePopups.map((popup) => {
        if (!visiblePopupIds.includes(popup.popupId)) return null;

        return (
          <div 
            key={popup.popupId}
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
               {/* 팝업 내용이 HTML이거나 이미지일 수 있음. 여기서는 이미지로 가정하거나 iframe 사용 가능 */}
               <img 
                 src={popup.fileUrl || '/api/placeholder/400/300'} 
                 alt={popup.popupTitleNm}
                 className="w-full h-auto object-contain"
               />
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-100 flex items-center justify-between px-4 border-t">
              <button 
                onClick={() => closePopupForDay(popup.popupId)}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 font-medium"
              >
                오늘 하루 보지 않기
              </button>
              <button 
                onClick={() => closePopup(popup.popupId)}
                className="text-[11px] font-bold text-slate-700 hover:text-black"
              >
                닫기
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
});
