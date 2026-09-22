package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_103 — {@code tb_user_info.sbscrb_ymd} 기본값이 컬럼 계약(yyyyMMdd, varchar(8))을 지키는지 본다.
 *
 * <p>V2_0 baseline 은 이 컬럼을 {@code character varying(8) DEFAULT CURRENT_TIMESTAMP} 로 만들었다.
 * CURRENT_TIMESTAMP 의 문자열은 8자를 넘어, 컬럼을 생략한 INSERT 는 기본값 적용 순간
 * "value too long" 으로 죽었다(postgres:17 · OCI live 실측). 앱은 Hibernate 가 모든 컬럼을 실어 보내
 * 이 결함을 만나지 않았지만 값을 채우는 코드가 없어 가입일자는 NULL 로만 저장됐고, 컬럼을 생략하는
 * 직접 SQL·이관·시드 경로는 언제나 실패했다. 이 테스트는 (1) 생략 INSERT 가 성공하고 Asia/Seoul
 * 오늘로 채워지는지, (2) 기본값 정의가 다시 CURRENT_TIMESTAMP 로 돌아가지 않는지를 고정한다.
 * 앱 경로가 가입일자를 명시적으로 채우는 것은 {@code UserServiceTest} 가 본다.
 */
@Tag("schema-validation")
@DisplayName("V2_103 가입일자 기본값 — 생략 INSERT 가 yyyyMMdd 로 채워진다")
class UserSignupDateDefaultIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("sbscrb_ymd 를 생략한 INSERT 는 실패하지 않고 Asia/Seoul 오늘(yyyyMMdd)로 채워진다")
    void omittedSignupDateIsFilledWithSeoulToday() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            // V2_103 이전에는 이 문장이 "value too long for type character varying(8)" 으로 죽었다.
            statement.executeUpdate(
                    "INSERT INTO tb_user_info (esntl_id, user_id, pswd, user_nm)"
                            + " VALUES ('T_SIGNUP_DEFAULT', 't_signup_default', 'x', '기본값 사용자')");

            try (ResultSet result = statement.executeQuery(
                    "SELECT sbscrb_ymd, to_char((now() AT TIME ZONE 'Asia/Seoul'), 'YYYYMMDD')"
                            + " FROM tb_user_info WHERE esntl_id = 'T_SIGNUP_DEFAULT'")) {
                assertThat(result.next()).isTrue();
                String stored = result.getString(1);
                assertThat(stored).matches("\\d{8}");
                // 같은 접속에서 같은 식으로 계산한 오늘과 같아야 한다(자정 경계는 같은 트랜잭션 시각이라 갈리지 않는다).
                assertThat(stored).isEqualTo(result.getString(2));
            }
        }
    }

    @Test
    @DisplayName("기본값 정의는 Asia/Seoul yyyyMMdd 표현식이다 — CURRENT_TIMESTAMP 로 되돌리면 red")
    void defaultExpressionIsPinned() throws SQLException {
        migrateThroughAuthorizationCutover();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT column_default FROM information_schema.columns"
                             + " WHERE table_name = 'tb_user_info' AND column_name = 'sbscrb_ymd'")) {
            assertThat(result.next()).isTrue();
            String definition = result.getString(1);
            assertThat(definition).contains("Asia/Seoul").contains("YYYYMMDD");
            assertThat(definition.toUpperCase()).doesNotContain("CURRENT_TIMESTAMP");
        }
    }
}
