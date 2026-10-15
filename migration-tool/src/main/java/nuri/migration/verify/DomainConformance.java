package nuri.migration.verify;

import nuri.migration.domain.DomainCategory;
import nuri.migration.domain.DomainValueRejected;
import nuri.migration.domain.DomainValues;
import nuri.migration.domain.DomainViolation;

/**
 * [ADR-0029 L4 D2] 대상 문자 값이 표준 형식 도메인에 맞는가 — 적재한 변환기({@link DomainValues})를 그대로 다시 적용해
 * 거부되거나 값이 바뀌면 위반이다. 표준 표기는 그 변환기의 고정점이므로 맞는 값은 그대로 돌아온다. 위반 코드만 돌려주고
 * 값은 싣지 않는다.
 */
public final class DomainConformance {

    private DomainConformance() {
    }

    /** 위반 코드. 맞거나 값이 NULL 이면 null. 형식 도메인이 아닌 범주는 받지 않는다. */
    public static DomainViolation check(DomainCategory category, Object value) {
        if (value == null) {
            return null;
        }
        String text = value instanceof String string ? string : value.toString();
        String normalized;
        try {
            normalized = switch (category) {
                case DATE8 -> DomainValues.ymd8(text);
                case DATETIME14 -> DomainValues.ymdhms14(text);
                case TIME6 -> DomainValues.hms6(text);
                case YN -> DomainValues.yn(text);
                default -> throw new IllegalArgumentException("not a format domain: " + category);
            };
        } catch (DomainValueRejected rejected) {
            return rejected.violation();
        }
        return text.equals(normalized) ? null : DomainViolation.FORMAT;
    }
}
