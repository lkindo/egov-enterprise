package com.company.project.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LogEntityTest {

    @Test
    @DisplayName("SysLog 엔티티 생성 테스트")
    void sysLogTest() {
        SysLog log = SysLog.builder()
                .requstId("REQ_01")
                .srvcNm("BoardService")
                .methodNm("getPosts")
                .processSeCode("R")
                .processTime("150") // String type
                .build();

        assertThat(log.getRequstId()).isEqualTo("REQ_01");
        assertThat(log.getSrvcNm()).isEqualTo("BoardService");
        assertThat(log.getProcessTime()).isEqualTo("150");
    }

    @Test
    @DisplayName("LoginLog 엔티티 필드 매핑 테스트")
    void loginLogTest() {
        LoginLog log = LoginLog.builder()
                .logId("LOG_01")
                .loginId("user01")
                .loginIp("127.0.0.1")
                .loginMthd("JWT")
                .build();

        assertThat(log.getLoginId()).isEqualTo("user01");
        assertThat(log.getLoginMthd()).isEqualTo("JWT");
    }
}
