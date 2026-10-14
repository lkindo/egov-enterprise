package nuri.migration.domain;

import java.util.Locale;

/**
 * 표준 도메인의 범주(ADR-0029 L3a-2). 도메인 이름 접두와 데이터 타입으로 정한다 — 적합성 추정기, 타깃 표준 검증의 여부
 * 도메인 판정, 원장의 도메인 가드가 모두 이 판정 하나를 쓴다. 기관 사전의 명명이 다르면 걸리지 않는다(설계 위험 8).
 *
 * <p>판정 순서가 뜻이다 — 8자리·14자리 날짜 이름이 데이터 타입보다 먼저고, 시각·여부 이름은 날짜·시간 타입보다 뒤다.
 * 숫자 타입은 코드 이름보다 먼저다.</p>
 */
public enum DomainCategory {
    DATE8,
    DATETIME14,
    TEMPORAL,
    TIME6,
    YN,
    NUMERIC,
    CODE,
    TEXT;

    /** 이름이나 타입이 없으면 빈 값으로 본다. 대상 데이터 타입은 대소문자를 가리지 않는다. */
    public static DomainCategory of(String domainName, String dataType) {
        String name = domainName == null ? "" : domainName;
        String type = dataType == null ? "" : dataType.toUpperCase(Locale.ROOT);
        if (name.startsWith("연월일C8")) {
            return DATE8;
        }
        if (name.startsWith("연월일시분초C14")) {
            return DATETIME14;
        }
        if (type.equals("DATE") || type.equals("DATETIME") || type.equals("TIMESTAMP")) {
            return TEMPORAL;
        }
        if (name.startsWith("시분초C6")) {
            return TIME6;
        }
        if (name.startsWith("여부") || name.startsWith("유무")) {
            return YN;
        }
        if (type.equals("NUMERIC") || type.equals("NUMBER") || type.equals("INTEGER") || type.equals("BIGINT")) {
            return NUMERIC;
        }
        if (name.startsWith("코드")) {
            return CODE;
        }
        return TEXT;
    }
}
