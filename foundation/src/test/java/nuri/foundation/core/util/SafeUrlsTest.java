package nuri.foundation.core.util;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SafeUrlsTest {

    @ParameterizedTest
    @ValueSource(strings = {"/pages/notice", "/", "https://example.gov.kr/a?b=1", "HTTP://example.gov.kr", "  /pages/notice  "})
    @DisplayName("사이트 안 경로와 http(s) 주소는 받는다")
    void acceptsSitePathsAndHttpUrls(String url) {
        assertThat(SafeUrls.isLinkable(url)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "//attacker.test", "/\\attacker.test",
        "\\\\attacker.test", "java\tscript:alert(1)", "java\nscript:alert(1)", "https://", "ftp://example.gov.kr", "pages/notice",
        "https://example.gov.kr/a b", "https://example.gov.kr\\@attacker.test",
    })
    @DisplayName("다른 스킴·프로토콜 상대 주소·제어 문자는 받지 않는다")
    void rejectsEverythingElse(String url) {
        assertThat(SafeUrls.isLinkable(url)).isFalse();
    }

    @Test
    @DisplayName("주소가 없으면 받는다 — 선택 입력이다")
    void acceptsMissingValues() {
        assertThat(SafeUrls.isLinkable(null)).isTrue();
        assertThat(SafeUrls.isLinkable("  ")).isTrue();
    }
}
