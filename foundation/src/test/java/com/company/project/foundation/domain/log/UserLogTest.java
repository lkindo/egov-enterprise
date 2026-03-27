package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UserLog 도메인 단위 테스트")
class UserLogTest {

    @Test
    @DisplayName("UserLog 생성 및 복합키 필드 확인 테스트")
    void userLogTest() {
        // given
        UserLog log = UserLog.builder()
                .occrrncDe("20241227")
                .rqesterId("user01")
                .srvcNm("UserService")
                .methodNm("updateUser")
                .creatCo(1)
                .updtCo(1)
                .rdCnt(10)
                .deleteCo(0)
                .outptCo(0)
                .errorCo(1)
                .build();

        // then
        assertThat(log.getOccrrncDe()).isEqualTo("20241227");
        assertThat(log.getRqesterId()).isEqualTo("user01");
        assertThat(log.getSrvcNm()).isEqualTo("UserService");
        assertThat(log.getMethodNm()).isEqualTo("updateUser");
        assertThat(log.getCreatCo()).isEqualTo(1);
        assertThat(log.getUpdtCo()).isEqualTo(1);
        assertThat(log.getRdCnt()).isEqualTo(10);
        assertThat(log.getDeleteCo()).isEqualTo(0);
        assertThat(log.getOutptCo()).isEqualTo(0);
        assertThat(log.getErrorCo()).isEqualTo(1);

        // check custom constructor (to reach 100% since it's used by SuperBuilder or manually)
        UserLog log2 = new UserLog("20241228", "user01", "S", "M", 1, 1, 1, 1, 1, 1);
        assertThat(log2.getOccrrncDe()).isEqualTo("20241228");
    }

    @Test
    @DisplayName("UserLogId Equals/HashCode 테스트")
    void userLogIdTest() {
        // given
        UserLogId id1 = new UserLogId("20241227", "user01", "S", "M");
        UserLogId id2 = new UserLogId("20241227", "user01", "S", "M");
        UserLogId id3 = new UserLogId("20241227", "user02", "S", "M");

        // then
        assertThat(id1).isEqualTo(id2);
        assertThat(id1).isNotEqualTo(id3);
        assertThat(id1.hashCode()).isEqualTo(id2.hashCode());
    }
}
