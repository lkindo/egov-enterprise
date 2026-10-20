'use client';

import { useId } from 'react';
import { NOTICE_POPUP_FRAME_CLASS, NoticePopupPanel } from '@/app/components/dashboard/PopupManager';
import type { PublicPopup } from '@/types/foundation/banner';
import { cn } from '@/lib/utils';

/**
 * 미리보기 화면 크기. 줄인 비율은 관리 창 폭에 맞춘 것이다 — 패널의 자리 규칙은 줄이기 전 크기(틀)로 계산된다.
 * 휴대폰 폭(40rem 미만)에서는 저장 좌표·크기 대신 아래쪽 시트로 보인다(사용자 화면과 같다).
 */
export const POPUP_PREVIEW_FRAMES = [
  { id: 'desktop', label: '데스크톱 화면', width: 1280, height: 800, scale: 0.3 },
  { id: 'phone', label: '휴대폰 화면', width: 360, height: 740, scale: 0.42 },
] as const;

const noop = () => undefined;

/**
 * [2026-10-20] 팝업 편집의 사용자 화면 미리보기. 종전에는 좌표·크기를 숫자로만 받아 실제로 어떻게 보일지 알 수 없었다.
 *
 * 사용자 화면의 대화상자가 그리는 패널(NoticePopupPanel)을 그대로 쓰고, 화면 전체 대신 데스크톱·휴대폰 크기의 틀에 넣는다 — 그래서
 * 자리·크기·시트 전환이 사용자 화면과 같은 CSS 로 정해진다. 미리보기는 그림일 뿐이라 단추를 누를 수 없고(inert) 보조기술에도 읽히지
 * 않는다 — 같은 내용을 두 번 읽히지 않게 하고, 설명은 틀의 이름(figcaption)이 맡는다.
 */
export function PopupPreview({ popup }: { popup: PublicPopup }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} data-testid="popup-preview" className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <h3 id={headingId} className="text-[length:var(--font-size-body)] font-medium text-foreground">사용자 화면 미리보기</h3>
      <p className="text-xs text-muted-foreground">
        사용자 화면과 같은 팝업을 데스크톱·휴대폰 크기 화면에 줄여 보입니다. 좌표·크기는 화면 안으로 맞춰지고, 휴대폰 폭에서는 아래쪽 시트로 보입니다.
      </p>
      <div className="flex flex-wrap items-start gap-4">
        {POPUP_PREVIEW_FRAMES.map((frame) => (
          <figure key={frame.id} data-testid={`popup-preview-${frame.id}`} className="space-y-1">
            <figcaption className="text-xs text-muted-foreground">{frame.label} ({frame.width}×{frame.height})</figcaption>
            <div
              className="relative overflow-hidden rounded border border-border bg-background"
              style={{ width: frame.width * frame.scale, height: frame.height * frame.scale }}
            >
              <div
                aria-hidden="true"
                inert
                data-testid={`popup-preview-${frame.id}-frame`}
                className={cn(NOTICE_POPUP_FRAME_CLASS, 'absolute left-0 top-0 origin-top-left bg-muted/60')}
                style={{ width: frame.width, height: frame.height, transform: `scale(${frame.scale})` }}
              >
                <NoticePopupPanel popup={popup} mode="preview" position={1} total={1} onDismiss={noop} onHideForToday={noop} />
              </div>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}
