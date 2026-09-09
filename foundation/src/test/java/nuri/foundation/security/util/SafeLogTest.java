package nuri.foundation.security.util;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SafeLogTest {
    @Test
    void neutralizesForgedLinesAndTerminalControls() {
        assertThat(SafeLog.text("/path\r\nFORGED\t\u001b[31m\u0085\u2028\u2029"))
                .isEqualTo("/path__FORGED__[31m___");
    }

    @Test
    void boundsUntrustedInputAndPreservesUsefulIdentifiers() {
        assertThat(SafeLog.text("x".repeat(10_000))).hasSize(256);
        assertThat(SafeLog.text("/api/v1/게시판/12")).isEqualTo("/api/v1/게시판/12");
        assertThat(SafeLog.text(null)).isEqualTo("<null>");
    }
}
