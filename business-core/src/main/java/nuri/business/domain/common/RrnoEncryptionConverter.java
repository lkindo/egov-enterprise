package nuri.business.domain.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import nuri.foundation.core.util.CryptoUtil;
import lombok.extern.slf4j.Slf4j;

/**
 * 주민등록번호(rrno) 양방향 암호화 JPA Converter.
 *
 * <p>[Wave 4] 키링({@link RrnoKeyring})이 구성되면 새 값은 AES-256-GCM {@code v2:<keyId>:...} 암호문으로 쓴다. 키링이 없으면 종전처럼
 * ARIA(CryptoUtil) 암호문을 쓴다. 읽기는 늘 두 형식을 받는다 — 접두 {@code v2:} 가 있으면 키링으로, 없으면 ARIA(그리고 과거 평문)로
 * 읽는다. 이관 도구의 ARIA 암호문(ADR-0029)과 기존 행은 키링을 켠 뒤에도 그대로 읽히고, 다음 저장 때 활성 키로 다시 암호화된다.
 */
@Slf4j
@Converter
public class RrnoEncryptionConverter implements AttributeConverter<String, String> {

    private static final java.util.regex.Pattern LEGACY_PLAINTEXT_RRNO =
            java.util.regex.Pattern.compile("^\\d{6}-?\\d{7}$");

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.trim().isEmpty()) {
            return null;
        }
        try {
            return RrnoKeyring.active() ? RrnoKeyring.encrypt(attribute) : CryptoUtil.encrypt(attribute);
        } catch (Exception e) {
            // [보안 D] 암호화 실패 시 평문 PII(주민번호)를 그대로 저장하면 개인정보가 DB에 노출된다.
            // → fail-closed: 저장을 거부하고 예외를 전파한다(무결성·보안 우선).
            log.error("Rrno encryption failed — refusing to persist plaintext PII", e);
            throw new IllegalStateException("Rrno encryption failed; refusing to persist plaintext PII", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }
        if (RrnoKeyring.isEnvelope(dbData)) {
            try {
                return RrnoKeyring.decrypt(dbData);
            } catch (RuntimeException e) {
                // 키링 암호문은 평문 호환이 없다 — 키가 없거나 값이 손상됐으면 막는다.
                log.error("Rrno keyring decryption failed — refusing to expose undecipherable data");
                throw new IllegalStateException("Rrno decryption failed; keyring or ciphertext integrity check required", e);
            }
        }
        try {
            return CryptoUtil.decrypt(dbData);
        } catch (Exception e) {
            // 과거 평문 행만 좁게 호환한다. 임의 문자열/구키 암호문을 주민번호 값처럼 반환하면
            // 애플리케이션이 손상된 암호문을 정상 PII로 오인하므로 그 밖은 fail-closed 한다.
            if (LEGACY_PLAINTEXT_RRNO.matcher(dbData).matches()) {
                log.warn("Legacy plaintext rrno detected; it will be encrypted on the next write.");
                return dbData;
            }
            log.error("Rrno decryption failed — refusing to expose undecipherable data", e);
            throw new IllegalStateException("Rrno decryption failed; key rotation or ciphertext integrity check required", e);
        }
    }
}
