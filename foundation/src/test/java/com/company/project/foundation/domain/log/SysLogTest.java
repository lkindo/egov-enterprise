package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SysLog 도메인 단위 테스트")
class SysLogTest {

    @Test
    @DisplayName("SysLog 생성 및 필드 확인 테스트")
    void sysLogTest() {
        // given
        SysLog log = SysLog.builder()
                .requstId("REQ-001")
                .srvcNm("SysService")
                .methodNm("sysMethod")
                .processSeCode("C")
                .processTime("100")
                .rqesterId("user01")
                .rqesterIp("127.0.0.1")
                .occrrncDe("20241227")
                .rspnsCode("200")
                .errorCode("E01")
                .errorSe("SER")
                .build();

        // then
        assertThat(log.getRequstId()).isEqualTo("REQ-001");
        assertThat(log.getSrvcNm()).isEqualTo("SysService");
        assertThat(log.getMethodNm()).isEqualTo("sysMethod");
        assertThat(log.getProcessSeCode()).isEqualTo("C");
        assertThat(log.getProcessTime()).isEqualTo("100");
    }

    @Test
    @DisplayName("SysLog 생성자 테스트")
    void sysLogConstructorTest() {
        // when
        SysLog log = new SysLog("REQ-002", "S", "M", "U", "50", "id", "ip", "20241227", "400", "E", "S");

        // then
        assertThat(log.getRequstId()).isEqualTo("REQ-002");
        assertThat(log.getProcessSeCode()).isEqualTo("U");
    }
}
