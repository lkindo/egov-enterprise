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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] generateUniqueId 는 **PK 충돌 방어**인데 전량 NO_COVERAGE 였다.
    //   generateId 는 UUID 를 length 로 절단하므로 엔트로피가 낮은 도메인에서 birthday 충돌이
    //   이론상 가능하다. 이 메서드는 리포지토리 존재검사로 그 충돌을 무재현화한다.
    //   재시도 루프가 무력화되면 **충돌 ID 가 그대로 PK 쓰기 경로로 나간다.**
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("충돌이 없으면 첫 후보를 그대로 쓴다")
    void returnsFirstCandidateWhenNoCollision() {
        java.util.List<String> asked = new java.util.ArrayList<>();

        String id = IdGenerationUtil.generateUniqueId("USR_", 10, candidate -> {
            asked.add(candidate);
            return false;   // 아무것도 존재하지 않는다
        });

        assertThat(asked).as("불필요한 재시도를 하면 안 된다").hasSize(1);
        assertThat(id).isEqualTo(asked.get(0));
        assertThat(id).startsWith("USR_");
    }

    @Test
    @DisplayName("충돌하면 다음 후보를 만든다 — 매번 새 값이어야 한다")
    void retriesWithFreshCandidateOnCollision() {
        java.util.List<String> asked = new java.util.ArrayList<>();

        String id = IdGenerationUtil.generateUniqueId("USR_", 10, candidate -> {
            asked.add(candidate);
            return asked.size() < 3;   // 앞의 두 번은 이미 존재
        });

        assertThat(asked).hasSize(3);
        // 같은 값을 다시 물어보면 재시도가 무의미하다 — 루프 안에서 새로 생성해야 한다.
        assertThat(asked).doesNotHaveDuplicates();
        assertThat(id).isEqualTo(asked.get(2));
    }

    @Test
    @DisplayName("재시도 한도를 넘기면 조용히 중복을 내보내지 않고 예외로 끝낸다")
    void throwsAfterRetryLimit() {
        java.util.concurrent.atomic.AtomicInteger calls = new java.util.concurrent.atomic.AtomicInteger();

        // 항상 충돌 — 루프 조건을 지운 뮤턴트는 무한 루프이거나 중복 ID 를 반환한다.
        assertThatThrownBy(() ->
                IdGenerationUtil.generateUniqueId("USR_", 10, c -> {
                    calls.incrementAndGet();
                    return true;
                }))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("고유 ID 생성 실패");

        assertThat(calls.get()).as("한도만큼만 시도한다").isEqualTo(5);
    }

    @Test
    @DisplayName("exists 검사기가 없으면 즉시 거부한다 — 검사 없는 '고유' 는 고유가 아니다")
    void rejectsNullPredicate() {
        assertThatThrownBy(() -> IdGenerationUtil.generateUniqueId("USR_", 10, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exists");
    }
}
