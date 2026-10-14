package nuri.migration.postgres;

import nuri.migration.suggest.StandardDictionary;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * 후보 생성용 표준 사전 전체를 읽는다(ADR-0029 결정 1). 동의어·허용값·폐기 여부 컬럼(V2_128)이 없으면 동의어 등급과
 * 폐기 용어 제외를 할 수 없으므로 읽지 않고 멈춘다.
 */
public final class PostgresStandardDictionaryReader {

    private static final String EXTENDED = """
            SELECT count(*)
              FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'meta_standard_terms'
               AND column_name IN ('synonyms', 'allowed_values', 'deprecated_yn')
            """;

    public StandardDictionary read(Connection connection, String schema) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        if (schema == null || !schema.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("표준 메타 schema 이름이 맞지 않습니다");
        }
        try (PreparedStatement check = connection.prepareStatement(EXTENDED)) {
            check.setString(1, schema);
            try (ResultSet rows = check.executeQuery()) {
                if (!rows.next() || rows.getInt(1) != 3) {
                    throw new IllegalStateException(
                            "이 schema 에서 표준 메타 확장 컬럼(V2_128)을 찾지 못해 후보를 만들 수 없습니다");
                }
            }
        }
        String qualified = "\"" + schema + "\".";
        List<StandardDictionary.Term> terms = new ArrayList<>();
        List<StandardDictionary.Word> words = new ArrayList<>();
        List<StandardDictionary.Domain> domains = new ArrayList<>();
        try (Statement statement = connection.createStatement()) {
            try (ResultSet rows = statement.executeQuery("SELECT term_name, eng_abbr, domain_name, synonyms,"
                    + " allowed_values, deprecated_yn FROM " + qualified + "meta_standard_terms ORDER BY eng_abbr")) {
                while (rows.next()) {
                    terms.add(new StandardDictionary.Term(rows.getString(1), rows.getString(2), rows.getString(3),
                            split(rows.getString(4)), rows.getString(5), "Y".equals(rows.getString(6))));
                }
            }
            try (ResultSet rows = statement.executeQuery("SELECT word_name, eng_abbr, rprs_yn FROM " + qualified
                    + "meta_standard_words ORDER BY word_name, eng_abbr")) {
                while (rows.next()) {
                    words.add(new StandardDictionary.Word(rows.getString(1), rows.getString(2),
                            !"N".equals(rows.getString(3))));
                }
            }
            try (ResultSet rows = statement.executeQuery("SELECT domain_group, domain_name, data_type, data_length"
                    + " FROM " + qualified + "meta_standard_domains ORDER BY domain_name")) {
                while (rows.next()) {
                    int length = rows.getInt(4);
                    Integer declared = rows.wasNull() ? null : length;
                    domains.add(new StandardDictionary.Domain(rows.getString(1), rows.getString(2),
                            rows.getString(3), declared));
                }
            }
        }
        return new StandardDictionary(terms, words, domains);
    }

    private static List<String> split(String synonyms) {
        if (synonyms == null || synonyms.isBlank()) {
            return List.of();
        }
        return Arrays.stream(synonyms.split(",")).map(String::strip).filter(value -> !value.isEmpty()).toList();
    }
}
