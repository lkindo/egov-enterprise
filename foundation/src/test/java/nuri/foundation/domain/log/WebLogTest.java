package nuri.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("WebLog 도메인 테스트")
class WebLogTest {

    @Test
    @DisplayName("WebLog 빌더 확인")
    void testBuilder() {
        WebLog log = WebLog.builder()
                .url("/api/v1/test")
                .rqesterId("user01")
                .build();

        assertEquals("/api/v1/test", log.getUrl());
    }
}