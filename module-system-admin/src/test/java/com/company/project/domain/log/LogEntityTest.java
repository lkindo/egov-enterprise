package com.company.project.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("로그 엔티티 테스트")
class LogEntityTest {

    @Test
    @DisplayName("LoginLog 빌더 테스트")
    void loginLogTest() {
        LocalDateTime now = LocalDateTime.now();
        LoginLog log = LoginLog.builder()
                .logId("LOG_001")
                .loginId("user01")
                .loginIp("127.0.0.1")
                .loginMthd("LOGIN")
                .errOccrrAt("N")
                .errorCode("000")
                .creatDt(now)
                .build();

        assertThat(log.getLogId()).isEqualTo("LOG_001");
        assertThat(log.getLoginId()).isEqualTo("user01");
        assertThat(log.getLoginIp()).isEqualTo("127.0.0.1");
        assertThat(log.getCreatDt()).isEqualTo(now);
    }

    @Test
    @DisplayName("PrivacyLog 빌더 및 초기화 테스트")
    void privacyLogTest() {
        LocalDateTime now = LocalDateTime.now();
        PrivacyLog log = PrivacyLog.builder()
                .requestId("REQ_001")
                .inquiryDatetime(now)
                .serviceName("UserService")
                .inquiryInfo("User Detail")
                .requesterId("admin")
                .requesterIp("192.168.0.1")
                .build();

        assertThat(log.getRequestId()).isEqualTo("REQ_001");
        assertThat(log.getInquiryDatetime()).isEqualTo(now);
        assertThat(log.getServiceName()).isEqualTo("UserService");
        
        log.setRequesterId("admin2");
        assertThat(log.getRequesterId()).isEqualTo("admin2");
    }

    @Test
    @DisplayName("UserLog 빌더 테스트")
    void userLogTest() {
        UserLog log = UserLog.builder()
                .occrrncDe("20240101")
                .rqesterId("user01")
                .srvcNm("BoardService")
                .methodNm("getList")
                .creatCo(1)
                .updtCo(2)
                .rdCnt(10)
                .deleteCo(0)
                .outptCo(5)
                .errorCo(0)
                .build();

        assertThat(log.getOccrrncDe()).isEqualTo("20240101");
        assertThat(log.getRqesterId()).isEqualTo("user01");
        assertThat(log.getSrvcNm()).isEqualTo("BoardService");
        assertThat(log.getRdCnt()).isEqualTo(10);
    }

    @Test
    @DisplayName("UserLogId 테스트")
    void userLogIdTest() {
        UserLogId id1 = new UserLogId("20240101", "u1", "s1", "m1");
        UserLogId id2 = new UserLogId("20240101", "u1", "s1", "m1");
        UserLogId id3 = new UserLogId("20240101", "u2", "s1", "m1");

        assertThat(id1).isEqualTo(id2);
        assertThat(id1).isNotEqualTo(id3);
        assertThat(id1.hashCode()).isEqualTo(id2.hashCode());
    }

    @Test
    @DisplayName("WebLog 빌더 테스트")
    void webLogTest() {
        LocalDateTime now = LocalDateTime.now();
        WebLog log = WebLog.builder()
                .requstId("REQ_WEB_001")
                .url("/api/data")
                .rqesterId("user01")
                .rqesterIp("10.0.0.1")
                .occrrncDe(now)
                .build();

        assertThat(log.getRequstId()).isEqualTo("REQ_WEB_001");
        assertThat(log.getUrl()).isEqualTo("/api/data");
        assertThat(log.getOccrrncDe()).isEqualTo(now);
    }
}
