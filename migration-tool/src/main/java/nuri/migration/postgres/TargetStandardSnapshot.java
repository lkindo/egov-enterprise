package nuri.migration.postgres;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * 매핑이 쓰는 target table 의 live 컬럼 계약(information_schema)과 표준 사전(meta_standard_*) 대조 결과.
 *
 * <p>값은 담지 않는다 — 컬럼 이름·타입·길이·NULL 허용·기본값 유무와 표준 용어·도메인 이름만 담는다.
 * 승인 workflow 는 이 스냅샷의 digest 를 target schema digest 에 함께 결속하므로, plan 뒤에 대상
 * 스키마나 표준 사전이 바뀌면 load 가 digest 불일치로 멈춘다.
 */
public record TargetStandardSnapshot(int schemaVersion, List<TableContract> tables) {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    public TargetStandardSnapshot {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be positive");
        }
        tables = Objects.requireNonNull(tables, "tables").stream()
                .map(table -> Objects.requireNonNull(table, "table"))
                .sorted(Comparator.comparing(TableContract::schema).thenComparing(TableContract::name))
                .toList();
    }

    /** schema·table 이름을 대소문자 무시로 찾는다. 없으면 null. */
    public TableContract table(String schema, String name) {
        for (TableContract table : tables) {
            if (table.schema().equalsIgnoreCase(schema) && table.name().equalsIgnoreCase(name)) {
                return table;
            }
        }
        return null;
    }

    /** 표준 사전 상태. ABSENT 는 대상 schema 에 meta 표가 둘 다 없다는 뜻이다. */
    public enum StandardStatus {
        PRESENT,
        ABSENT,
        /** meta_standard_terms·meta_standard_domains 중 하나만 있다. */
        INCOMPLETE,
        /** 사전이 있지만 읽지 못했다(권한·필수 컬럼 부재 등). */
        UNREADABLE
    }

    /** 컬럼 계약을 읽은 결과. */
    public enum ContractStatus {
        READ,
        /** information_schema 에서 컬럼을 하나도 읽지 못했다. */
        UNREADABLE,
        /** information_schema 와 JDBC metadata 의 컬럼 집합이 다르다(권한으로 가려진 컬럼 등). */
        INCOMPLETE
    }

    public record TableContract(
            String schema,
            String name,
            ContractStatus contract,
            StandardStatus standard,
            List<ColumnContract> columns) {

        public TableContract {
            schema = requireText(schema, "table.schema");
            name = requireText(name, "table.name");
            contract = Objects.requireNonNull(contract, "table.contract");
            standard = Objects.requireNonNull(standard, "table.standard");
            columns = Objects.requireNonNull(columns, "table.columns").stream()
                    .map(column -> Objects.requireNonNull(column, "column"))
                    .sorted(Comparator.comparingInt(ColumnContract::ordinal)
                            .thenComparing(ColumnContract::name))
                    .toList();
        }

        public String qualifiedName() {
            return schema + "." + name;
        }

        /** 컬럼을 대소문자 무시로 찾는다. 없으면 null. */
        public ColumnContract column(String column) {
            for (ColumnContract candidate : columns) {
                if (candidate.name().equalsIgnoreCase(column)) {
                    return candidate;
                }
            }
            return null;
        }
    }

    /**
     * information_schema.columns 한 행. 길이·정밀도·자릿수가 null 이면 제한이 없다는 뜻이다.
     * {@code identityGeneration} 은 {@code ALWAYS}·{@code BY DEFAULT}·null 중 하나다.
     */
    public record ColumnContract(
            String name,
            int ordinal,
            String dataType,
            Integer characterMaximumLength,
            Integer numericPrecision,
            Integer numericScale,
            boolean nullable,
            boolean hasDefault,
            String identityGeneration,
            boolean generated,
            StandardTerm term) {

        public ColumnContract {
            name = requireText(name, "column.name");
            dataType = requireText(dataType, "column.dataType").toLowerCase(Locale.ROOT);
            if (ordinal <= 0) {
                throw new IllegalArgumentException("column.ordinal must be positive");
            }
        }

        /** 값을 주지 않아도 DB 가 채우는 컬럼인가. */
        public boolean databaseFilled() {
            return hasDefault || identityGeneration != null || generated;
        }
    }

    /** 컬럼 이름을 영문약어로 하는 표준 용어와 그 도메인. 사전이 없거나 용어가 없으면 컬럼의 term 은 null 이다. */
    public record StandardTerm(
            TermStatus status,
            String engAbbr,
            String domainName,
            String domainDataType,
            Integer domainLength) {

        public StandardTerm {
            status = Objects.requireNonNull(status, "term.status");
            engAbbr = requireText(engAbbr, "term.engAbbr");
        }
    }

    public enum TermStatus {
        FOUND,
        /** 같은 영문약어의 용어가 둘 이상이다. */
        AMBIGUOUS,
        /** 용어의 도메인 이름이 비었거나 도메인 표에 없다. */
        DOMAIN_MISSING,
        /** 같은 이름의 도메인이 둘 이상이다. */
        DOMAIN_AMBIGUOUS
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value;
    }
}
