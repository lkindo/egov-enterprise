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
            log.warn("Rrno encryption failed, using plaintext as fallback: {}", e.getMessage());
            return attribute;
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
