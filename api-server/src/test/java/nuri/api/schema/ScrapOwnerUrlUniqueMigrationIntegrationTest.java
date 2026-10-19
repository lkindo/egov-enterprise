package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

/**
 * V2_135 가 스크랩에 (등록자, 주소) 유일 제약을 거는지 본다.
 *
 * <p>[왜 필요한가] 서비스가 등록 전에 겹침을 막아도, 같은 사람의 두 요청이 동시에 들어오면 둘 다 '없음' 을 보고 저장한다.
 * DB 제약만이 그 경합을 닫는다. 반대로 범위가 넓으면 다른 사용자끼리, 또는 주소·등록자가 없는 레거시 행끼리 막힌다.
 * 이미 중복이 있는 환경에서는 어느 행을 남길지 정할 수 없으므로 아무것도 바꾸지 않고 멈춰야 한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_135 스크랩 (등록자, 주소) 유일 제약")
class ScrapOwnerUrlUniqueMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE = "db/migration/V2_135__add_scrap_owner_url_unique.sql";

    @Test
    @DisplayName("중복이 있으면 멈추고, 적용 뒤에는 같은 사용자의 같은 주소만 거부한다(사용 안 함 행 포함, NULL·다른 사용자는 허용)")
    void enforcesOneScrapPerOwnerAndUrl() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.134")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        // 이미 중복이 있으면 아무것도 바꾸지 않고 사유를 말하며 멈춘다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(insert("dup-user", "https://dup.example.com", "Y") + "; "
                        + insert("dup-user", "https://dup.example.com", "N"));
                assertThatExceptionOfType(SQLException.class)
                        .as("중복 행이 있는데 제약이 걸렸다")
                        .isThrownBy(() -> statement.execute(sql))
                        .withMessageContaining("V2_135: 같은 사용자가 같은 주소로 남긴 스크랩이 둘 이상 있습니다");
            } finally {
                connection.rollback();
            }
        }

        flyway(MigrationVersion.fromVersion("2.135")).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            statement.execute(insert("owner-a", "https://same.example.com", "Y"));
            // 다른 사용자의 같은 주소, 같은 사용자의 다른 주소, 등록자·주소가 없는 행끼리는 막지 않는다.
            statement.execute(insert("owner-b", "https://same.example.com", "Y"));
            statement.execute(insert("owner-a", "https://other.example.com", "Y"));
            statement.execute(insert(null, "https://legacy.example.com", "Y") + "; "
                    + insert(null, "https://legacy.example.com", "Y"));
            statement.execute(insert("owner-a", null, "Y") + "; " + insert("owner-a", null, "Y"));

            assertUniqueViolation(statement, insert("owner-a", "https://same.example.com", "Y"), "같은 사용자의 같은 주소");
            assertUniqueViolation(statement, insert("owner-a", "https://same.example.com", "N"),
                    "사용 안 함 행도 같은 주소로 겹칠 수 없다(서비스가 되살린다)");
        }
    }

    private static void assertUniqueViolation(Statement statement, String insert, String label) {
        assertThatExceptionOfType(SQLException.class)
                .as("%s 가 저장됐다", label)
                .isThrownBy(() -> statement.execute(insert))
                .satisfies(failure -> {
                    assertThat(failure.getSQLState()).as("UNIQUE 위반이어야 409 로 돌아간다").isEqualTo("23505");
                    assertThat(failure.getMessage()).contains("uk_tb_bbs_scrap_frst_rgtr_id_scrap_url");
                });
    }

    private static String insert(String owner, String url, String useYn) {
        return "INSERT INTO tb_bbs_scrap (scrap_nm, scrap_url, use_yn, frst_rgtr_id) VALUES ('V2_135', "
                + literal(url) + ", '" + useYn + "', " + literal(owner) + ")";
    }

    private static String literal(String value) {
        return value == null ? "NULL" : "'" + value + "'";
    }
}
