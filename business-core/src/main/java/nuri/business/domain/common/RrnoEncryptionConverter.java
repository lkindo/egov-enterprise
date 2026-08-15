package nuri.business.domain.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import nuri.foundation.core.util.CryptoUtil;
import lombok.extern.slf4j.Slf4j;

/**
 * 주민등록번호(rrno) 양방향 ARIA 암호화 JPA Converter
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
            return CryptoUtil.encrypt(attribute);
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
