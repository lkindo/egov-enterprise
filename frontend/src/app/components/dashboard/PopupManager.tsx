import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { popupService } from '@/services/business/user/PopupService';
import { isCanceledRequest } from '@/lib/safe-error-log';
import { Popup } from '@/types/foundation/banner';
import Image from 'next/image';
import { AttachmentImage, extractAtchFileSn } from '@/app/components/ui/attachment-image';

/*
  [2026-09-26 DIP V9] 브라우저 저장소는 사생활 모드·저장소 차단에서 예외를 던진다. 종전에는 그 예외가
  팝업 조회 전체를 실패로 만들어, 저장소를 못 쓰는 사용자는 공지 팝업을 아예 보지 못했다.
  '오늘 하루' 숨김은 편의 기능이므로 저장소가 안 되면 숨김만 잃는다.
*/
function readHiddenUntil(popupSn: number): number | null {
    try {
        const raw = localStorage.getItem(`popup_hide_${popupSn}`);
        return raw ? parseInt(raw, 10) : null;
    } catch {
        return null;
    }
}

function clearHidden(popupSn: number) {
    try {
        localStorage.removeItem(`popup_hide_${popupSn}`);
    } catch {
        // 저장소를 쓸 수 없으면 지울 것도 없다.
    }
}

/** '오늘 하루' 는 24시간이 아니라 오늘 자정(사용자 시각)까지다 — 밤 11시에 닫으면 다음 날 아침에 다시 보인다. */
function hideUntilMidnight(popupSn: number) {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    try {
        localStorage.setItem(`popup_hide_${popupSn}`, midnight.getTime().toString());
    } catch {
        // 저장하지 못하면 이번 화면에서만 닫힌다.
    }
}

export function PopupManager() {
    const [activePopups, setActivePopups] = useState<Popup[]>([]);
    const [visiblePopupSns, setVisiblePopupSns] = useState<number[]>([]);

    useEffect(() => {
        async function fetchPopups() {
            try {
                const popups = await popupService.getActivePopups();
                // 필터링 "오늘 하루 보지 않기" 체크된 팝업 제외
                const filteredPopups = (popups || []).filter(popup => {
                    const hiddenUntil = readHiddenUntil(popup.popupSn);
                    if (hiddenUntil !== null) {
                        if (Date.now() < hiddenUntil) {
                            return false;
                        }
                        clearHidden(popup.popupSn);
                    }
                    return true;
                });

                setActivePopups(filteredPopups);
                setVisiblePopupSns(filteredPopups.map(p => p.popupSn));
            } catch (error) {
                // [2026-09-16] 취소는 실패가 아니다 — 인증 상태 변경으로 이전 요청 결과를 버린 경우다.
                if (!isCanceledRequest(error)) {
                    console.error('Failed to fetch popups:', error);
                }
            }
        }
        fetchPopups();
    }, []);

    const closePopup = (sn: number) => {
        setVisiblePopupSns(prev => prev.filter(popupSn => popupSn !== sn));
    };

    const closePopupForDay = (id: number) => {
        hideUntilMidnight(id);
        closePopup(id);
    };

    if (visiblePopupSns.length === 0) return null;

    return (
        <>
            {activePopups.map((popup, idx) => {
                if (!visiblePopupSns.includes(popup.popupSn)) return null;

                return (
                    <div
                        key={`popup-${popup.popupSn}-${idx}`}
                        className="fixed z-[9999] bg-card shadow-2xl rounded-lg overflow-hidden border animate-in zoom-in duration-300"
                        style={{
                            top: `${popup.popupVrtcPstn}px`,
                            left: `${popup.popupWdthPstn}px`,
                            width: `${popup.popupWdthSz}px`,
                            height: `${popup.popupVrtcSz}px`,
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
                            <span className="text-sm font-bold truncate">{popup.popupTtlNm}</span>
                            <button
                                onClick={() => closePopup(popup.popupSn)}
                                aria-label={`${popup.popupTtlNm || '팝업'} 닫기`}
                                className="p-1 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative w-full h-[calc(100%-80px)] overflow-auto">
                            {/* 팝업 내용이 HTML이거나 이미지일 수 있음. 여기서는 이미지로 가정하거나 iframe 사용 가능 */}
                            <div className="relative w-full min-h-[300px] h-full">
                                {/* fileUrl 에는 첨부 URL(레거시 `?fileId=` 형태 포함) 또는 외부 URL 이 들어온다.
                                    첨부라면 blob 으로 받아 그린다 — `<img src>` 로는 인증되지 않기 때문이다. */}
                                {extractAtchFileSn(popup.fileUrl) ? (
                                    <AttachmentImage
                                        atchFileSn={extractAtchFileSn(popup.fileUrl)}
                                        alt={popup.popupTtlNm}
                                        className="h-full w-full object-contain"
                                    />
                                ) : (
                                    <Image
                                        src={popup.fileUrl || '/api/placeholder/400/300'}
                                        alt={popup.popupTtlNm}
                                        fill
                                        unoptimized
                                        className="object-contain"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-muted flex items-center justify-between px-4 border-t">
                            <button
                                onClick={() => closePopupForDay(popup.popupSn)}
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium"
                            >
                                오늘 하루 보지 않기
                            </button>
                            <button
                                onClick={() => closePopup(popup.popupSn)}
                                className="text-xs font-bold text-foreground hover:text-black"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                );
            })}
        </>
    );
}
