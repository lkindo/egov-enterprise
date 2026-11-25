package nuri.business.domain.common;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 서버 정렬 허용 목록(GAP-UI-001) — 화면이 보내는 정렬 키·방향을 인덱스가 받치는 속성의 고정 정렬로만 바꾸고, 목록 밖은 400 이다.
 *
 * <p>[2026-11-25 품질 평가 3순위 14] 이 판정은 HQL 주입·미인덱스 전체 정렬을 막는 경계인데 직접 시험이 없어 변이 시험 범위
 * (business-core-code-user-common)에서 한 건도 닿지 않았다. 서비스 시험은 목록 밖 키의 거부만 보고 방향·빈 값·대소문자·공백은
 * 보지 않는다.
 */
class ServerSortWhitelistTest {

    private final ServerSortWhitelist whitelist = ServerSortWhitelist.of(Map.of("name", "userNm", "joined", "sbscrbYmd"));

    @Test
    @DisplayName("허용 키는 엔티티 속성의 오름차순, desc 는 내림차순이다 — 방향은 대소문자·앞뒤 공백을 가리지 않는다")
    void allowedKeyMapsToTheEntityPropertyInTheRequestedDirection() {
        assertThat(whitelist.resolve("name", null)).isEqualTo(Sort.by(Sort.Direction.ASC, "userNm"));
        assertThat(whitelist.resolve("name", "asc")).isEqualTo(Sort.by(Sort.Direction.ASC, "userNm"));
        assertThat(whitelist.resolve("joined", "desc")).isEqualTo(Sort.by(Sort.Direction.DESC, "sbscrbYmd"));
        assertThat(whitelist.resolve(" joined ", " DESC ")).isEqualTo(Sort.by(Sort.Direction.DESC, "sbscrbYmd"));
        assertThat(whitelist.resolve("name", "")).isEqualTo(Sort.by(Sort.Direction.ASC, "userNm"));
    }

    @Test
    @DisplayName("키가 비면 정렬 없음이다 — 방향도 비어 있을 때만")
    void blankKeyWithoutDirectionIsUnsorted() {
        assertThat(whitelist.resolve(null, null)).isEqualTo(Sort.unsorted());
        assertThat(whitelist.resolve("  ", "")).isEqualTo(Sort.unsorted());
    }

    @Test
    @DisplayName("방향만 보내면 400 이다 — 조용히 무시하면 화면은 정렬된 결과로 읽는다")
    void directionWithoutKeyIsRejected() {
        assertInvalid(() -> whitelist.resolve(null, "desc"), "정렬 기준을 함께");
        assertInvalid(() -> whitelist.resolve("", "asc"), "정렬 기준을 함께");
    }

    @Test
    @DisplayName("asc·desc 밖의 방향은 키와 관계없이 400 이다")
    void unknownDirectionIsRejected() {
        assertInvalid(() -> whitelist.resolve("name", "up"), "asc 또는 desc");
        assertInvalid(() -> whitelist.resolve(null, "descending"), "asc 또는 desc");
    }

    @Test
    @DisplayName("목록 밖의 키는 400 이고 허용 키를 정렬해 알린다 — 속성 이름을 그대로 정렬에 쓰지 않는다")
    void unknownKeyIsRejectedWithTheSortedAllowList() {
        assertInvalid(() -> whitelist.resolve("userNm", "asc"), "허용: joined, name");
        assertInvalid(() -> whitelist.resolve("name; drop", null), "허용: joined, name");
    }

    @Test
    @DisplayName("만든 뒤 원본 지도를 바꿔도 허용 목록은 그대로다")
    void allowListIsCopiedAtConstruction() {
        Map<String, String> source = new java.util.HashMap<>(Map.of("name", "userNm"));
        ServerSortWhitelist copied = ServerSortWhitelist.of(source);
        source.put("pswd", "pswd");

        assertThat(copied).isNotNull();
        assertInvalid(() -> copied.resolve("pswd", null), "허용: name");
    }

    private static void assertInvalid(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String message) {
        assertThatThrownBy(call)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining(message);
    }
}
