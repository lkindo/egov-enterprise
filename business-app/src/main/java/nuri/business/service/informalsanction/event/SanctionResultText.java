package nuri.business.service.informalsanction.event;

import nuri.business.domain.informalsanction.SanctionStatus;
import org.springframework.util.StringUtils;

/** 결재 결과 알림 문구 — 앱 내 알림({@link SanctionEventListener})과 문자·메일({@link SanctionExternalNotificationWorkHandler})이 함께 쓴다. */
final class SanctionResultText {

    /** SMS·메일 저장 본문과 앱 알림 본문의 공통 물리 상한. */
    static final int CHANNEL_CONTENT_MAX_LENGTH = 4_000;

    private SanctionResultText() {
    }

    /**
     * 문자·메일 본문. [2026-09-05] 종전 본문은 `%s` 에 상태 enum 을 넣어 사용자가 "APPROVED 되었습니다" 를 받았고, 승인에도
     * '사유: 없음' 이 붙었다. enum 의 한국어 설명을 쓰고 사유는 반려에만 싣는다.
     */
    static String externalMessage(Long sanctionSn, SanctionStatus status, String reason) {
        return bound(String.format("[eGov Enterprise] 귀하의 결재(번호 %s)가 %s되었습니다.%s",
                sanctionSn, statusLabel(status), reasonSuffix(status, reason)));
    }

    /** 사용자에게 보이는 상태 이름 — enum 상수명(APPROVED)이 아니라 한국어 설명(승인)이다. */
    static String statusLabel(SanctionStatus status) {
        return status == null ? "처리" : status.getDescription();
    }

    /** 사유 절은 반려에만 붙인다. 승인 본문에 '사유: 없음' 을 달지 않는다. */
    static String reasonSuffix(SanctionStatus status, String reason) {
        return status == SanctionStatus.REJECTED
                ? " 반려 사유: " + (StringUtils.hasText(reason) ? reason : "없음")
                : "";
    }

    /** 접두어를 포함해 완성된 채널 본문을 자르며 UTF-16 surrogate pair는 분리하지 않는다. */
    static String bound(String content) {
        if (content.length() <= CHANNEL_CONTENT_MAX_LENGTH) {
            return content;
        }
        int end = CHANNEL_CONTENT_MAX_LENGTH;
        if (Character.isHighSurrogate(content.charAt(end - 1))) {
            end--;
        }
        return content.substring(0, end);
    }
}
