package com.company.project.domain.system.service.survey;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OnlinePollManage 엔티티 테스트")
class OnlinePollManageTest {

    @Test
    @DisplayName("OnlinePollManage 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        OnlinePollManage poll = OnlinePollManage.builder()
                .pollId("POLL_001")
                .pollNm("Survey 2024")
                .pollBeginDe("20240101")
                .pollEndDe("20241231")
                .pollKindCode("K01")
                .frstRegisterId("admin")
                .build();

        assertThat(poll.getPollId()).isEqualTo("POLL_001");
        assertThat(poll.getPollNm()).isEqualTo("Survey 2024");
        assertThat(poll.getPollBeginDe()).isEqualTo("20240101");
        assertThat(poll.getPollEndDe()).isEqualTo("20241231");
        assertThat(poll.getPollKindCode()).isEqualTo("K01");
        assertThat(poll.getPollDsuseYn()).isEqualTo("N");
        assertThat(poll.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("OnlinePollManage 엔티티 수정 테스트")
    void updateTest() {
        OnlinePollManage poll = OnlinePollManage.builder()
                .pollId("POLL_001")
                .pollNm("Old Survey")
                .build();

        poll.update("New Survey", "20240201", "20241130", "K02", "Y", "Y", "staff");

        assertThat(poll.getPollNm()).isEqualTo("New Survey");
        assertThat(poll.getPollBeginDe()).isEqualTo("20240201");
        assertThat(poll.getPollEndDe()).isEqualTo("20241130");
        assertThat(poll.getPollKindCode()).isEqualTo("K02");
        assertThat(poll.getPollDsuseYn()).isEqualTo("Y");
        assertThat(poll.getPollAutoDsuseYn()).isEqualTo("Y");
        assertThat(poll.getLastModifiedBy()).isEqualTo("staff");
    }
}
