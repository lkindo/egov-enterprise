package nuri.foundation.domain.common;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.math.BigDecimal;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 문자열 계약을 유지하는 필드만 명시적으로 NUMERIC(..., 0)에 바인딩한다.
 * 업무별 허용 범위는 요청·서비스에서 검사하고, 여기서는 정수 표현과 NULL을 보존한다.
 */
@Converter(autoApply = false)
public class IntegralStringConverter implements AttributeConverter<String, BigDecimal> {

    private static final Pattern INTEGER = Pattern.compile("0|-?[1-9][0-9]*");

    @Override
    public @Nullable BigDecimal convertToDatabaseColumn(@Nullable String attribute) {
        if (attribute == null) return null;
        if (!INTEGER.matcher(attribute).matches()) {
            throw new IllegalArgumentException("NUMERIC integer mapping requires a canonical integer string");
        }
        return new BigDecimal(attribute);
    }

    @Override
    public @Nullable String convertToEntityAttribute(@Nullable BigDecimal dbData) {
        return dbData == null ? null : dbData.toBigIntegerExact().toString();
    }
}
