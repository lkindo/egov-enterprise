package nuri.business.domain.informalsanction;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ApprovalStatus {
    WAITING("W"), ACTIVE("A"), APPROVED("C"), REJECTED("R"), CANCELLED("S");

    private final String code;

    public static ApprovalStatus fromCode(String code) {
        for (ApprovalStatus status : values()) {
            if (status.code.equals(code)) return status;
        }
        throw new IllegalArgumentException("Unknown approval line status");
    }
}
