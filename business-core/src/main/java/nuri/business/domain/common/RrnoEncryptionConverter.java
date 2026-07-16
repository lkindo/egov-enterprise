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
            log.warn("Rrno decryption failed, using plaintext as fallback: {}", e.getMessage());
            return dbData;
        }
    }
}
