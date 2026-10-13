package nuri.migration.protect;

import java.util.Optional;

/**
 * 온라인 앱이 대상 컬럼을 보호하는 방식(DEC-OPS-308). mapping 의 {@code encrypt} 값이 이 id 다.
 *
 * <p>{@code migratable} 이 false 인 방식은 이관 도구가 만들지 않는다. 그 컬럼은 매핑할 수 없고, 온라인 앱에서
 * 다시 만든다(예: MFA 비밀은 사용자가 다시 등록한다).
 */
public enum ColumnProtection {

    /** {@code RrnoEncryptionConverter}·{@code CryptoUtil} 의 eGov ARIA-256(ECB·Base64). 키는 앱의 ALGORITHM_KEY 와 같은 값. */
    ARIA_EGOV_V1("aria-egov-v1", true),

    /** {@code MfaSecretCipher} 의 AES-256-GCM(무작위 nonce, 사용자·자격 버전 결속). 이관하지 않는다. */
    MFA_AES_GCM_V1("mfa-aes-gcm-v1", false);

    private final String id;
    private final boolean migratable;

    ColumnProtection(String id, boolean migratable) {
        this.id = id;
        this.migratable = migratable;
    }

    public String id() {
        return id;
    }

    public boolean migratable() {
        return migratable;
    }

    public static Optional<ColumnProtection> byId(String id) {
        for (ColumnProtection protection : values()) {
            if (protection.id.equals(id)) {
                return Optional.of(protection);
            }
        }
        return Optional.empty();
    }
}
