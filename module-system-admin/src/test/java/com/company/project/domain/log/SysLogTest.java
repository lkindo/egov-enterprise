package com.company.project.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SysLog 엔티티 테스트")
class SysLogTest {

    @Test
    @DisplayName("SysLog 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        SysLog log = SysLog.builder()
                .requstId("REQ_001")
                .srvcNm("BoardService")
                .methodNm("createPost")
                .processSeCode("C")
                .processTime("100")
                .rqesterId("user01")
                .rqesterIp("127.0.0.1")
                .occrrncDe("20240101")
                .rspnsCode("200")
                .build();

        assertThat(log.getRequstId()).isEqualTo("REQ_001");
        assertThat(log.getSrvcNm()).isEqualTo("BoardService");
        assertThat(log.getMethodNm()).isEqualTo("createPost");
        assertThat(log.getRqesterId()).isEqualTo("user01");
        assertThat(log.getRqesterIp()).isEqualTo("127.0.0.1");
    }
}
