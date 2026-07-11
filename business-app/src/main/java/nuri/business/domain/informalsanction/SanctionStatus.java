package nuri.business.domain.informalsanction;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 결재 상태 열거형
 */
@Getter
@RequiredArgsConstructor
public enum SanctionStatus {
    REQUESTED("A", "신청"),
    APPROVED("C", "승인"),
    REJECTED("R", "반려");

    private final String code;
    private final String description;

    public static SanctionStatus fromCode(String code) {
        for (SanctionStatus status : values()) {
            if (status.code.equals(code)) {
                return status;
            }
        }
        return REQUESTED; // Default
    }
}
