package nuri.migration.postgres;

import nuri.migration.postgres.TargetStandardSnapshot.ColumnContract;
import nuri.migration.postgres.TargetStandardSnapshot.ContractStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardStatus;
import nuri.migration.postgres.TargetStandardSnapshot.StandardTerm;
import nuri.migration.postgres.TargetStandardSnapshot.TableContract;
import nuri.migration.postgres.TargetStandardSnapshot.TermStatus;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 대상 PostgreSQL 의 live 컬럼 계약과 표준 사전을 읽는다(read-only).
 *
 * <p>컬럼 계약은 {@code information_schema.columns} 에서 읽고, 같은 표의 JDBC metadata 컬럼 집합과
 * 대조한다. information_schema 는 권한 없는 컬럼을 숨기므로 집합이 다르면 계약을 믿지 않는다.
 * 표준 사전은 대상 표와 같은 schema 의 {@code meta_standard_terms}·{@code meta_standard_domains} 다.
 * 존재 여부는 권한과 무관한 {@code pg_class} 로 판정해, 읽을 권한이 없는 사전을 "없음"으로 오인하지 않는다.
 *
 * <p>읽기 실패는 예외로 던지지 않고 상태(UNREADABLE 등)로 남긴다 — 검증기가 표·컬럼 이름으로
 * 실패를 알리고 승인을 막는다. 코드젠 스냅샷({@code db_columns.json})으로 대신하지 않는다.
 */
public final class PostgresTargetStandardReader {

    static final String TERMS = "meta_standard_terms";
    static final String DOMAINS = "meta_standard_domains";

    private static final Pattern SAFE_SCHEMA = Pattern.compile("[a-z][a-z0-9_]*");

    private static final String COLUMNS_SQL = """
            SELECT column_name, ordinal_position, data_type, character_maximum_length,
                   numeric_precision, numeric_scale, is_nullable, column_default,
                   is_identity, identity_generation, is_generated
              FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ?
            """;

    private static final String META_PRESENCE_SQL = """
            SELECT c.relname
              FROM pg_catalog.pg_class c
              JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = ? AND c.relname IN ('meta_standard_terms', 'meta_standard_domains')
               AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
            """;

    /**
     * @param tables 읽을 표(schema → table 이름, 소문자 identifier)
     * @param jdbcColumns 같은 표의 JDBC metadata 컬럼 이름(소문자). 집합이 다르면 INCOMPLETE 로 남긴다.
     */
    public TargetStandardSnapshot read(Connection connection, Map<String, Set<String>> tables,
                                       Map<String, Set<String>> jdbcColumns) {
        List<TableContract> contracts = new ArrayList<>();
        Map<String, StandardStatus> presence = new HashMap<>();
        for (Map.Entry<String, Set<String>> schemaTables : tables.entrySet()) {
            String schema = schemaTables.getKey();
            if (!SAFE_SCHEMA.matcher(schema).matches()) {
                throw new IllegalArgumentException("target schema identifier is invalid");
            }
            for (String table : schemaTables.getValue()) {
                contracts.add(readTable(connection, schema, table,
                        jdbcColumns.getOrDefault(schema + "." + table, Set.of()), presence));
            }
        }
        return new TargetStandardSnapshot(TargetStandardSnapshot.CURRENT_SCHEMA_VERSION, contracts);
    }

    private TableContract readTable(Connection connection, String schema, String table,
                                    Set<String> jdbcColumns, Map<String, StandardStatus> presence) {
        List<RawColumn> raw;
        try {
            raw = readColumns(connection, schema, table);
        } catch (SQLException unreadable) {
            return new TableContract(schema, table, ContractStatus.UNREADABLE, StandardStatus.UNREADABLE, List.of());
        }
        if (raw.isEmpty()) {
            return new TableContract(schema, table, ContractStatus.UNREADABLE, StandardStatus.UNREADABLE, List.of());
        }
        Set<String> contractNames = new LinkedHashSet<>();
        raw.forEach(column -> contractNames.add(column.name().toLowerCase(Locale.ROOT)));
        ContractStatus contract = contractNames.equals(jdbcColumns) ? ContractStatus.READ : ContractStatus.INCOMPLETE;

        StandardStatus standard = presence.computeIfAbsent(schema, ignored -> presence(connection, schema));
        Map<String, StandardTerm> terms = Map.of();
        if (standard == StandardStatus.PRESENT) {
            try {
                terms = readTerms(connection, schema, raw);
            } catch (SQLException unreadable) {
                standard = StandardStatus.UNREADABLE;
            }
        }
        List<ColumnContract> columns = new ArrayList<>();
        for (RawColumn column : raw) {
            columns.add(column.toContract(terms.get(column.name().toUpperCase(Locale.ROOT))));
        }
        return new TableContract(schema, table, contract, standard, columns);
    }

    private static List<RawColumn> readColumns(Connection connection, String schema, String table)
            throws SQLException {
        List<RawColumn> columns = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(COLUMNS_SQL)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    columns.add(new RawColumn(
                            rows.getString("column_name"),
                            rows.getInt("ordinal_position"),
                            rows.getString("data_type"),
                            nullableInt(rows, "character_maximum_length"),
                            nullableInt(rows, "numeric_precision"),
                            nullableInt(rows, "numeric_scale"),
                            "YES".equalsIgnoreCase(rows.getString("is_nullable")),
                            rows.getString("column_default") != null,
                            "YES".equalsIgnoreCase(rows.getString("is_identity"))
                                    ? rows.getString("identity_generation") : null,
                            "ALWAYS".equalsIgnoreCase(rows.getString("is_generated"))));
                }
            }
        }
        return columns;
    }

    private static StandardStatus presence(Connection connection, String schema) {
        Set<String> found = new LinkedHashSet<>();
        try (PreparedStatement statement = connection.prepareStatement(META_PRESENCE_SQL)) {
            statement.setString(1, schema);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    found.add(rows.getString(1));
                }
            }
        } catch (SQLException unreadable) {
            return StandardStatus.UNREADABLE;
        }
        if (found.isEmpty()) {
            return StandardStatus.ABSENT;
        }
        return found.size() == 2 ? StandardStatus.PRESENT : StandardStatus.INCOMPLETE;
    }

    private static Map<String, StandardTerm> readTerms(Connection connection, String schema, List<RawColumn> columns)
            throws SQLException {
        List<String> abbreviations = columns.stream()
                .map(column -> column.name().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        Map<String, List<String>> domainsByAbbr = new LinkedHashMap<>();
        String termSql = "SELECT upper(eng_abbr), domain_name FROM " + quote(schema) + "." + TERMS
                + " WHERE upper(eng_abbr) = ANY (?)";
        try (PreparedStatement statement = connection.prepareStatement(termSql)) {
            Array array = connection.createArrayOf("text", abbreviations.toArray());
            statement.setArray(1, array);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    domainsByAbbr.computeIfAbsent(rows.getString(1), ignored -> new ArrayList<>())
                            .add(rows.getString(2));
                }
            }
        }
        Set<String> domainNames = new LinkedHashSet<>();
        domainsByAbbr.values().forEach(names -> names.stream()
                .filter(name -> name != null && !name.isBlank())
                .forEach(domainNames::add));
        Map<String, List<Domain>> domains = new LinkedHashMap<>();
        String domainSql = "SELECT domain_name, data_type, data_length FROM " + quote(schema) + "." + DOMAINS
                + " WHERE domain_name = ANY (?)";
        try (PreparedStatement statement = connection.prepareStatement(domainSql)) {
            Array array = connection.createArrayOf("text", domainNames.toArray());
            statement.setArray(1, array);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    domains.computeIfAbsent(rows.getString(1), ignored -> new ArrayList<>())
                            .add(new Domain(rows.getString(2), nullableInt(rows, "data_length")));
                }
            }
        }
        Map<String, StandardTerm> terms = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : domainsByAbbr.entrySet()) {
            terms.put(entry.getKey(), term(entry.getKey(), entry.getValue(), domains));
        }
        return terms;
    }

    private static StandardTerm term(String abbreviation, List<String> domainNames, Map<String, List<Domain>> domains) {
        if (domainNames.size() > 1) {
            return new StandardTerm(TermStatus.AMBIGUOUS, abbreviation, null, null, null);
        }
        String domainName = domainNames.getFirst();
        List<Domain> matches = domainName == null ? List.of() : domains.getOrDefault(domainName, List.of());
        if (matches.isEmpty()) {
            return new StandardTerm(TermStatus.DOMAIN_MISSING, abbreviation, domainName, null, null);
        }
        if (matches.size() > 1) {
            return new StandardTerm(TermStatus.DOMAIN_AMBIGUOUS, abbreviation, domainName, null, null);
        }
        Domain domain = matches.getFirst();
        return new StandardTerm(TermStatus.FOUND, abbreviation, domainName, domain.dataType(), domain.length());
    }

    private static Integer nullableInt(ResultSet rows, String column) throws SQLException {
        int value = rows.getInt(column);
        return rows.wasNull() ? null : value;
    }

    private static String quote(String identifier) {
        return "\"" + identifier + "\"";
    }

    private record Domain(String dataType, Integer length) {}

    private record RawColumn(
            String name,
            int ordinal,
            String dataType,
            Integer characterMaximumLength,
            Integer numericPrecision,
            Integer numericScale,
            boolean nullable,
            boolean hasDefault,
            String identityGeneration,
            boolean generated) {

        ColumnContract toContract(StandardTerm term) {
            return new ColumnContract(name, ordinal, dataType, characterMaximumLength, numericPrecision,
                    numericScale, nullable, hasDefault, identityGeneration, generated, term);
        }
    }
}
