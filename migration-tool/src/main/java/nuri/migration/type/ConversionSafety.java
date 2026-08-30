package nuri.migration.type;

/**
 * 소스 네이티브 타입에서 타깃 논리 타입으로 변환할 때의 데이터 안전 경계.
 *
 * <p>등급 자체는 승인을 저장하지 않는다. 검증 증거와 사용자 승인은 migration plan의 별도 상태로
 * 관리해야 하며, 이 열거형만 보고 손실 변환을 자동 실행해서는 안 된다.
 */
public enum ConversionSafety {
    LOSSLESS,
    VALIDATED,
    LOSSY_REQUIRES_APPROVAL,
    MANUAL,
    UNSUPPORTED;

    /** 사전 census나 승인 없이 자동 변환해도 되는 유일한 등급이다. */
    public boolean permitsAutomaticConversion() {
        return this == LOSSLESS;
    }

    public boolean requiresValidation() {
        return this == VALIDATED;
    }

    public boolean requiresApproval() {
        return this == LOSSY_REQUIRES_APPROVAL;
    }

    public boolean blocksAutomaticConversion() {
        return this == MANUAL || this == UNSUPPORTED;
    }
}
