package nuri.foundation.core.util;

import nuri.foundation.constants.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("IdGenerationUtil 단위 테스트")
class IdGenerationUtilTest {

    @Test
    @DisplayName("generateId - 접두사 + 대문자 hex 로 지정 길이만큼 생성")
    void generateId_prefixAndUppercaseHex() {
        String id = IdGenerationUtil.generateId("TEST_", 12);
        assertThat(id).startsWith("TEST_");
        String body = id.substring("TEST_".length());
        assertThat(body).hasSize(12);
        // UUID hex를 대문자화 → [0-9A-F] 만 포함
        assertThat(body).matches("[0-9A-F]+");
    }

    @Test
    @DisplayName("generateId - length 경계값 32 허용")
    void generateId_maxLengthBoundary() {
        String id = IdGenerationUtil.generateId("P_", 32);
        assertThat(id.substring(2)).hasSize(32);
    }

    @Test
    @DisplayName("generateId - prefix가 null이면 IllegalArgumentException")
    void generateId_nullPrefix_throws() {
        assertThatThrownBy(() -> IdGenerationUtil.generateId(null, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("generateId - length가 범위(1..32)를 벗어나면 IllegalArgumentException")
    void generateId_invalidLength_throws() {
        assertThatThrownBy(() -> IdGenerationUtil.generateId("P_", 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> IdGenerationUtil.generateId("P_", -1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> IdGenerationUtil.generateId("P_", 33))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("도메인별 생성기 - 표준 접두사 및 총 길이 검증")
    void domainGenerators_prefixAndLength() {
        assertThat(IdGenerationUtil.generateUserId())
                .startsWith(Constants.User.USER_PREFIX)
                .hasSize(Constants.User.USER_PREFIX.length() + Constants.User.UUID_LENGTH);

        assertThat(IdGenerationUtil.generateMberId())
                .startsWith(Constants.User.MBER_PREFIX)
                .hasSize(Constants.User.MBER_PREFIX.length() + Constants.User.ESNTL_ID_UUID_LENGTH);


        assertThat(IdGenerationUtil.generateSmsId())
                .startsWith(Constants.User.SMS_PREFIX);
        assertThat(IdGenerationUtil.generateMailId())
                .startsWith(Constants.User.MAIL_PREFIX);
    }

    @Test
    @DisplayName("연속 생성 시 값이 서로 다름(유일성 스모크)")
    void generateId_uniqueness() {
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            ids.add(IdGenerationUtil.generateUserId());
        }
        // 16 hex(64bit)라 1000건 정도에서는 충돌이 사실상 없어야 함
        assertThat(ids).hasSize(1000);
    }
}
