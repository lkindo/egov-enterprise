package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_128 이 표준 용어에 동의어·허용값·폐기 여부를 더하고 공통표준 CSV 의 값을 채우는지 본다(ADR-0029 결정 10).
 *
 * <p>[왜 필요한가] 이관 도구의 용어 매핑 원장은 폐기 용어를 확정하지 못하게 막고(DEC-OPS-312), 후보 생성은
 * 동의어와 허용값을 근거로 쓴다. live 메타에 그 값이 없으면 두 검사가 근거 없이 통과한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_128 표준 용어 동의어·허용값·폐기 여부")
class MetaStandardTermsExtensionMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("행 수와 기존 열은 그대로 두고 CSV 의 동의어·허용값·폐기 여부만 채운다")
    void addsAndFillsTheStandardDictionaryColumns() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.127")));
        long before;
        String ipAddressBefore;
        try (var c = openConnection(); var s = c.createStatement()) {
            before = number(s, "SELECT count(*) FROM meta_standard_terms");
            ipAddressBefore = text(s, "SELECT term_name || '|' || domain_name FROM meta_standard_terms"
                    + " WHERE eng_abbr = 'IP_ADDR'");
        }

        flyway(MigrationVersion.fromVersion("2.128")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(number(s, "SELECT count(*) FROM meta_standard_terms")).isEqualTo(before);
            assertThat(text(s, "SELECT term_name || '|' || domain_name FROM meta_standard_terms"
                    + " WHERE eng_abbr = 'IP_ADDR'")).isEqualTo(ipAddressBefore);
            assertThat(number(s, "SELECT count(*) FROM meta_standard_terms WHERE synonyms IS NOT NULL"))
                    .isEqualTo(759);
            assertThat(number(s, "SELECT count(*) FROM meta_standard_terms WHERE allowed_values IS NOT NULL"))
                    .isEqualTo(5033);
            assertThat(text(s, "SELECT string_agg(eng_abbr, ',' ORDER BY eng_abbr) FROM meta_standard_terms"
                    + " WHERE deprecated_yn = 'Y'"))
                    .isEqualTo("MSRMT_BRNCH_NM,ROOF_CD,STLI_NM,STTY_EMD_NM,TYPE_AST_AMT");
            assertThat(text(s, "SELECT synonyms FROM meta_standard_terms WHERE eng_abbr = 'IP_ADDR'"))
                    .isEqualTo("아이피주소");
            assertThat(text(s, "SELECT allowed_values FROM meta_standard_terms WHERE eng_abbr = 'ABLD_YN'"))
                    .isEqualTo("Y : 여(예), N : 부(아니요)");
            assertThat(text(s, "SELECT coalesce(synonyms, '-') || '|' || coalesce(allowed_values, '-')"
                    + " FROM meta_standard_terms WHERE eng_abbr = 'TXPR_NM'"))
                    .as("CSV 에 서로 다른 값으로 두 번 나오는 약어는 채우지 않는다").isEqualTo("-|-");
            assertThatThrownBy(() -> s.executeUpdate(
                    "UPDATE meta_standard_terms SET deprecated_yn = 'X' WHERE eng_abbr = 'IP_ADDR'"))
                    .isInstanceOf(SQLException.class);
        }
    }

    private static long number(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
