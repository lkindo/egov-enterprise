package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;

import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

/** 컴파일 시점에 검토 가능하며 명시적 discovery 호출에서만 실행되는 vendor catalog SELECT 정의. */
public record VendorCatalogQuery(
        ObjectKind kind,
        String operation,
        String sql,
        int schemaParameterCount,
        ObjectSupportGrade supportGrade,
        VendorRowProjection projection) {

    private static final Pattern MUTATING_TOKEN = Pattern.compile(
            "\\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|CALL|EXEC|GRANT|REVOKE)\\b",
            Pattern.CASE_INSENSITIVE);

    public VendorCatalogQuery {
        kind = Objects.requireNonNull(kind, "kind");
        operation = requireText(operation, "operation");
        sql = requireText(sql, "sql");
        supportGrade = Objects.requireNonNull(supportGrade, "supportGrade");
        projection = Objects.requireNonNull(projection, "projection");
        if (schemaParameterCount <= 0) {
            throw new IllegalArgumentException("schemaParameterCount must be positive");
        }
        String normalized = sql.stripLeading().toUpperCase(Locale.ROOT);
        if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
            throw new IllegalArgumentException("vendor catalog query must start with SELECT or WITH");
        }
        if (sql.indexOf(';') >= 0 || MUTATING_TOKEN.matcher(sql).find()) {
            throw new IllegalArgumentException("vendor catalog query must be a single read-only statement");
        }
        if (count(sql, '?') < schemaParameterCount) {
            throw new IllegalArgumentException("schema parameter placeholders are missing");
        }
        if (supportGrade == ObjectSupportGrade.UNSUPPORTED) {
            throw new IllegalArgumentException("an executable catalog query cannot be UNSUPPORTED");
        }
    }

    public VendorCatalogQuery(
            ObjectKind kind,
            String operation,
            String sql,
            int schemaParameterCount,
            ObjectSupportGrade supportGrade) {
        this(kind, operation, sql, schemaParameterCount, supportGrade, VendorRowProjection.standard());
    }

    /** 현재 공통 query가 inventory의 알려진 일부 범위만 읽는지 명시한다. */
    public boolean partialScope() {
        return kind == ObjectKind.PARTITION || kind == ObjectKind.GRANT || kind == ObjectKind.JOB;
    }

    /** 성공-empty도 완전 수집으로 오인하지 않도록 snapshot에 남길 안전한 설명이다. */
    public String partialScopeMessage() {
        return switch (kind) {
            case PARTITION -> "partition rows are inventoried but the complete parent partition strategy is not proven";
            case GRANT -> "the vendor query covers a limited privilege scope and is not a complete security census";
            case JOB -> "the declared scheduler catalog does not prove complete job inventory";
            default -> null;
        };
    }

    private static int count(String value, char expected) {
        int count = 0;
        for (int index = 0; index < value.length(); index++) {
            if (value.charAt(index) == expected) {
                count++;
            }
        }
        return count;
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
