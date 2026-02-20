package com.company.project.domain.duty;

import com.company.project.domain.TestQuerydslConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestQuerydslConfig.class)
@ActiveProfiles("test")
class DutyRepositoryTest {

    @Autowired
    private BndtManageRepository dutyRepository;

    @Test
    @DisplayName("?諭彛???? ??륁뵠筌?鈺곌퀬?????뮞??)
    void findByBndtDeStartingWith_Pagination() {
        // given
        // create 20 duties
        for (int i = 1; i <= 20; i++) {
            String bndtDe = String.format("202310%02d", i);
            BndtManage duty = BndtManage.builder()
                    .bndtId("TEST_ID")
                    .bndtDe(bndtDe)
                    .remark("Remark " + i)
                    .build();
            duty.setCreatedBy("SYSTEM");
            duty.setLastModifiedBy("SYSTEM");
            dutyRepository.save(duty);
        }

        // when
        // page 0, size 10
        PageRequest pageRequest = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "bndtDe"));
        Page<BndtManage> page = dutyRepository.findByBndtDeStartingWith("202310", pageRequest);

        // then
        assertThat(page.getTotalElements()).isEqualTo(20);
        assertThat(page.getContent()).hasSize(10);
        assertThat(page.getContent().get(0).getBndtDe()).isEqualTo("20231001");
        assertThat(page.getContent().get(9).getBndtDe()).isEqualTo("20231010");

        // next page
        PageRequest pageRequest2 = PageRequest.of(1, 10, Sort.by(Sort.Direction.ASC, "bndtDe"));
        Page<BndtManage> page2 = dutyRepository.findByBndtDeStartingWith("202310", pageRequest2);

        assertThat(page2.getContent()).hasSize(10);
        assertThat(page2.getContent().get(0).getBndtDe()).isEqualTo("20231011");
    }

    @Test
    @DisplayName("?諭彛???? ??륁뵠筌?鈺곌퀬??- 野꺜??깅선 ??곸벉")
    void findByBndtDeStartingWith_Pagination_NoKeyword() {
         // given
        BndtManage duty1 = BndtManage.builder()
                .bndtId("TEST_ID")
                .bndtDe("20231001")
                .build();
        duty1.setCreatedBy("SYSTEM");
        dutyRepository.save(duty1);

        BndtManage duty2 = BndtManage.builder()
                .bndtId("TEST_ID")
                .bndtDe("20231101")
                .build();
        duty2.setCreatedBy("SYSTEM");
        dutyRepository.save(duty2);

        // when
        // empty string should match all
        PageRequest pageRequest = PageRequest.of(0, 10);
        Page<BndtManage> page = dutyRepository.findByBndtDeStartingWith("", pageRequest);

        // then
        assertThat(page.getTotalElements()).isEqualTo(2);
    }
}
