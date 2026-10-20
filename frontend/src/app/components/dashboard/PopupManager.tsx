import { useState, useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { X } from 'lucide-react';
import { popupService } from '@/services/business/user/PopupService';
import { isCanceledRequest } from '@/lib/safe-error-log';
import { PublicPopup } from '@/types/foundation/banner';
import Image from 'next/image';
import { AttachmentImage, extractAtchFileSn } from '@/app/components/ui/attachment-image';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

/*
  [2026-10-20] 공지 팝업의 자리와 크기.

  종전에는 저장된 좌표·크기를 px 그대로 `fixed` 상자에 넣었다 — 휴대폰 폭에서는 화면 밖으로 넘쳤고, 팝업이 여럿이면 같은 자리에 겹쳤다.
  이제 저장값은 CSS 변수로만 넘기고, 자리는 감싸는 틀(size 컨테이너)의 크기 안으로 CSS 가 묶는다. 틀 폭이 40rem(휴대폰 폭) 미만이면 저장값을
  쓰지 않고 아래쪽 시트로 보인다. 전환은 CSS 만 한다(ADR-0006 — 화면 폭을 JS 로 읽어 분기하지 않는다). 틀이 화면 전체면 사용자 화면이고,
  관리 화면의 미리보기는 같은 패널을 휴대폰·데스크톱 크기의 틀에 넣는다 — 그래서 미리보기도 사용자 화면과 같은 규칙으로 그려진다.
*/
const POSITION_MAX = 10000;
const SIZE_MIN = 100;
const SIZE_MAX = 4000;

/** 저장값(문자열 12자리까지)을 정수 px 로 읽는다. 숫자가 아니면 기본값, 범위를 벗어나면 가장 가까운 끝값이다. */
function storedPx(raw: string | null | undefined, fallback: number, min: number, max: number): number {
    const value = Number.parseInt(String(raw ?? '').trim(), 10);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(Math.max(value, min), max);
}

/** 패널의 저장 좌표·크기를 CSS 변수로 싣는다(자리 계산은 클래스가 한다). */
export function noticePopupGeometry(popup: Pick<PublicPopup, 'popupWdthPstn' | 'popupVrtcPstn' | 'popupWdthSz' | 'popupVrtcSz'>) {
    return {
        '--popup-x': `${storedPx(popup.popupWdthPstn, 0, 0, POSITION_MAX)}px`,
        '--popup-y': `${storedPx(popup.popupVrtcPstn, 0, 0, POSITION_MAX)}px`,
        '--popup-w': `${storedPx(popup.popupWdthSz, 400, SIZE_MIN, SIZE_MAX)}px`,
        '--popup-h': `${storedPx(popup.popupVrtcSz, 300, SIZE_MIN, SIZE_MAX)}px`,
    } as CSSProperties;
}

/**
 * 패널을 담는 틀 — 이 틀의 폭·높이가 패널 자리의 기준이다(사용자 화면은 화면 전체, 미리보기는 미리보기 칸).
 * 폭만이 아니라 높이(cqh)도 틀을 따라야 하므로 inline-size(@container) 가 아니라 size 컨테이너다 — 틀은 내용과 무관한 정해진 크기다.
 */
export const NOTICE_POPUP_FRAME_CLASS = '[container-type:size]';

/**
 * 패널 자리 클래스. 휴대폰 폭(틀 40rem 미만)은 아래쪽 시트, 넓은 폭은 저장 좌표·크기를 틀 안(가장자리 0.5rem)으로 묶은 상자다.
 * 시험이 이 클래스를 고정한다 — 자리를 JS 로 계산하는 쪽으로 되돌리면 붉다.
 */
export const NOTICE_POPUP_PANEL_CLASS = cn(
    'pointer-events-auto absolute flex flex-col overflow-hidden border-border bg-card text-card-foreground shadow-2xl',
    // 휴대폰 폭: 아래쪽 시트 — 저장된 좌표·크기를 쓰지 않는다.
    'inset-x-0 bottom-0 max-h-[85cqh] rounded-t-xl border-t',
    // 넓은 폭: 저장된 크기는 틀보다 크지 않게, 좌표는 패널이 틀 밖으로 나가지 않게 묶는다.
    '[--popup-w-fit:min(var(--popup-w),calc(100cqw_-_1rem))] [--popup-h-fit:min(var(--popup-h),calc(100cqh_-_1rem))]',
    '@min-[40rem]:inset-x-auto @min-[40rem]:bottom-auto @min-[40rem]:max-h-none @min-[40rem]:rounded-lg @min-[40rem]:border',
    '@min-[40rem]:w-(--popup-w-fit) @min-[40rem]:h-(--popup-h-fit)',
    '@min-[40rem]:left-[clamp(0.5rem,var(--popup-x),calc(100cqw_-_0.5rem_-_var(--popup-w-fit)))]',
    '@min-[40rem]:top-[clamp(0.5rem,var(--popup-y),calc(100cqh_-_0.5rem_-_var(--popup-h-fit)))]',
);

interface NoticePopupPanelProps {
    popup: PublicPopup;
    /** 'dialog' 는 사용자 화면(대화상자 제목·설명으로 이름을 잇는다), 'preview' 는 관리 화면의 미리보기다. */
    mode: 'dialog' | 'preview';
    /** 몇 번째 공지인가 — 여러 팝업은 한 번에 하나씩 순서대로 보인다. */
    position: number;
    total: number;
    onDismiss: () => void;
    onHideForToday: () => void;
    titleRef?: RefObject<HTMLHeadingElement | null>;
}

/**
 * 공지 팝업 패널 — 사용자 화면의 대화상자와 관리 화면의 미리보기가 같은 이 패널을 그린다.
 *
 * 닫기·오늘 하루 보지 않기는 지금 공지만 닫고, 남은 공지가 있으면 다음 공지가 이어진다('다음 공지').
 * '오늘 하루 보지 않기' 는 관리자가 '다시보지않기 처리' 를 끄면 두지 않는다(종전에는 그 설정과 관계없이 늘 보였다).
 */
export function NoticePopupPanel({ popup, mode, position, total, onDismiss, onHideForToday, titleRef }: NoticePopupPanelProps) {
    const title = popup.popupTtlNm || '공지';
    const hasNext = position < total;
    const sequence = total > 1 ? `공지 ${position}/${total}` : '공지';
    const atchFileSn = extractAtchFileSn(popup.fileUrl);
    const titleClass = 'truncate text-sm font-bold text-foreground';
    const sequenceClass = 'text-xs text-muted-foreground';
    return (
        <section
            data-testid="notice-popup-panel"
            data-popup-sn={popup.popupSn}
            className={NOTICE_POPUP_PANEL_CLASS}
            style={noticePopupGeometry(popup)}
        >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2">
                <div className="min-w-0">
                    {/* 대화상자에서는 제목·순번이 대화상자의 이름(aria-labelledby)·설명(aria-describedby)이 된다. 미리보기는 대화상자가 아니다. */}
                    {mode === 'dialog' ? (
                        <>
                            <DialogTitle ref={titleRef} tabIndex={-1} className={titleClass}>{title}</DialogTitle>
                            <DialogDescription className={sequenceClass}>{sequence}</DialogDescription>
                        </>
                    ) : (
                        <>
                            <h3 className={titleClass}>{title}</h3>
                            <p className={sequenceClass}>{sequence}</p>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={`${title} 닫기`}
                    className="shrink-0 rounded-lg p-1 transition-colors hover:bg-muted"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </header>

            {/* 팝업 내용은 이미지다. 휴대폰 시트는 높이를 두지 않으므로 그림 칸에 높이를 준다(fill 그림은 칸 높이가 있어야 보인다). */}
            <div className="relative h-[min(60cqh,var(--popup-h))] min-h-0 w-full shrink-0 overflow-auto @min-[40rem]:h-auto @min-[40rem]:flex-1">
                {/* fileUrl 에는 첨부 URL(레거시 `?fileId=` 형태 포함) 또는 외부 URL 이 들어온다.
                    첨부라면 blob 으로 받아 그린다 — `<img src>` 로는 인증되지 않기 때문이다. */}
                {atchFileSn ? (
                    <AttachmentImage atchFileSn={atchFileSn} alt={title} className="h-full w-full object-contain" />
                ) : popup.fileUrl ? (
                    <Image src={popup.fileUrl} alt={title} fill unoptimized className="object-contain" />
                ) : (
                    // 종전에는 없는 자리 표시 경로(/api/placeholder)를 그림으로 걸었다 — 깨진 그림 대신 사실을 말한다.
                    <p className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">등록된 이미지가 없습니다.</p>
                )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-2 border-t bg-muted px-4 py-2">
                {popup.stopvewSetupYn !== 'N' ? (
                    <Button type="button" variant="ghost" size="sm" onClick={onHideForToday} className="h-auto px-1 text-xs font-medium text-muted-foreground hover:text-primary">
                        오늘 하루 보지 않기
                    </Button>
                ) : <span aria-hidden="true" />}
                <Button type="button" variant={hasNext ? 'default' : 'outline'} size="sm" onClick={onDismiss} className="text-xs font-bold">
                    {hasNext ? '다음 공지' : '닫기'}
                </Button>
            </footer>
        </section>
    );
}

interface NoticePopupDialogProps {
    /** 지금 보일 공지. 마지막 공지를 닫는 동안(퇴장 애니메이션)에도 그 공지를 그대로 넘긴다 — 빈 상자가 깜박이지 않게 한다. */
    popup: PublicPopup;
    open: boolean;
    position: number;
    total: number;
    onDismiss: () => void;
    onHideForToday: () => void;
}

/**
 * 공지 팝업 대화상자 — 공용 대화상자 원천(components/ui/dialog, Radix)을 쓴다.
 *
 * 종전 팝업은 `role="dialog"`·`aria-modal`·초점 이동·Esc 가 없어 키보드·화면낭독기 사용자가 팝업이 떴는지조차 알 수 없었고, 뒤의 화면을
 * 그대로 조작할 수 있었다. 이제 aria-modal 대화상자로 열고, 제목으로 이름을 잇고(aria-labelledby), 초점을 제목으로 옮겨 안에 가두며,
 * Esc 로 닫고, 다 닫으면 열리기 전 초점 자리로 돌려놓는다(StandardModal 과 같은 방식 — 제어형이라 Radix 가 되돌릴 트리거가 없다).
 *
 * 대화상자 상자는 화면 전체를 덮는 틀이고 눈에 보이는 상자는 그 안의 패널이다 — 패널 자리가 틀(화면) 크기를 기준으로 CSS 로 정해지게 하기
 * 위해서다(NOTICE_POPUP_PANEL_CLASS).
 */
export function NoticePopupDialog({ popup, open, position, total, onDismiss, onHideForToday }: NoticePopupDialogProps) {
    const invoker = useRef<HTMLElement | null>(null);
    const titleRef = useRef<HTMLHeadingElement | null>(null);

    // 다음 공지로 넘어가면 대화상자는 열린 채 내용만 바뀐다 — 새 공지의 제목으로 초점을 옮겨 바뀐 사실을 알린다.
    const popupSn = popup.popupSn;
    useEffect(() => {
        if (open && position > 1) titleRef.current?.focus({ preventScroll: true });
    }, [open, popupSn, position]);

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
            <DialogContent
                showCloseButton={false}
                data-testid="notice-popup-dialog"
                // Radix 는 모달을 뒤 화면 aria-hidden·초점 가두기로 구현하고 aria-modal 은 달지 않는다 — 보조기술이 모달임을 바로 알게 명시한다.
                aria-modal="true"
                className={cn(
                    NOTICE_POPUP_FRAME_CLASS,
                    // 기본 대화상자 상자(가운데 정렬·여백·테두리)를 걷어 화면 전체 틀로 쓴다. 눈에 보이는 상자는 패널이다.
                    'inset-0 top-0 left-0 block h-full w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-transparent p-0 shadow-none sm:max-w-none',
                )}
                onOpenAutoFocus={(event) => {
                    invoker.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                    if (titleRef.current) {
                        event.preventDefault();
                        titleRef.current.focus({ preventScroll: true });
                    }
                }}
                onCloseAutoFocus={(event) => {
                    if (invoker.current?.isConnected) {
                        event.preventDefault();
                        invoker.current.focus({ preventScroll: true });
                    }
                }}
            >
                <NoticePopupPanel
                    key={popup.popupSn}
                    popup={popup}
                    mode="dialog"
                    position={position}
                    total={total}
                    onDismiss={onDismiss}
                    onHideForToday={onHideForToday}
                    titleRef={titleRef}
                />
            </DialogContent>
        </Dialog>
    );
}

export function PopupManager() {
    const [popups, setPopups] = useState<PublicPopup[]>([]);
    /** 지금 보이는 공지의 순번(0부터). 여러 팝업은 겹쳐 띄우지 않고 한 번에 하나씩 순서대로 보인다. */
    const [index, setIndex] = useState(0);

    useEffect(() => {
        async function fetchPopups() {
            try {
                const active = await popupService.getActivePopups();
                // 필터링 "오늘 하루 보지 않기" 체크된 팝업 제외
                const filteredPopups = (active || []).filter(popup => {
                    const hiddenUntil = readHiddenUntil(popup.popupSn);
                    if (hiddenUntil !== null) {
                        if (Date.now() < hiddenUntil) {
                            return false;
                        }
                        clearHidden(popup.popupSn);
                    }
                    return true;
                });

                setPopups(filteredPopups);
                setIndex(0);
            } catch (error) {
                // [2026-09-16] 취소는 실패가 아니다 — 인증 상태 변경으로 이전 요청 결과를 버린 경우다.
                if (!isCanceledRequest(error)) {
                    console.error('Failed to fetch popups:', error);
                }
            }
        }
        fetchPopups();
    }, []);

    if (popups.length === 0) return null;

    // 다 닫았으면(index 가 끝을 지나면) 대화상자를 닫되, 닫히는 동안에는 마지막 공지를 그대로 그린다.
    const shownIndex = Math.min(index, popups.length - 1);
    const current = popups[shownIndex];
    const open = index < popups.length;
    const showNext = () => setIndex(prev => prev + 1);
    return (
        <NoticePopupDialog
            popup={current}
            open={open}
            position={shownIndex + 1}
            total={popups.length}
            onDismiss={showNext}
            onHideForToday={() => {
                hideUntilMidnight(current.popupSn);
                showNext();
            }}
        />
    );
}
