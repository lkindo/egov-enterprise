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
    private DutyRepository dutyRepository;

    @Test
    @DisplayName("당직 일지 페이징 조회 테스트")
    void findById_BndtDeStartingWith_Pagination() {
        // given
        // create 20 duties
        for (int i = 1; i <= 20; i++) {
            String bndtDe = String.format("202310%02d", i);
            Duty duty = Duty.builder()
                    .id(new Duty.DutyId("TEST_ID", bndtDe))
                    .remark("Remark " + i)
                    .frstRegisterId("SYSTEM")
                    .lastUpdusrId("SYSTEM")
                    .build();
            dutyRepository.save(duty);
        }

        // when
        // page 0, size 10
        PageRequest pageRequest = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "id.bndtDe"));
        Page<Duty> page = dutyRepository.findById_BndtDeStartingWith("202310", pageRequest);

        // then
        assertThat(page.getTotalElements()).isEqualTo(20);
        assertThat(page.getContent()).hasSize(10);
        assertThat(page.getContent().get(0).getId().getBndtDe()).isEqualTo("20231001");
        assertThat(page.getContent().get(9).getId().getBndtDe()).isEqualTo("20231010");

        // next page
        PageRequest pageRequest2 = PageRequest.of(1, 10, Sort.by(Sort.Direction.ASC, "id.bndtDe"));
        Page<Duty> page2 = dutyRepository.findById_BndtDeStartingWith("202310", pageRequest2);

        assertThat(page2.getContent()).hasSize(10);
        assertThat(page2.getContent().get(0).getId().getBndtDe()).isEqualTo("20231011");
    }

    @Test
    @DisplayName("당직 일지 페이징 조회 - 검색어 없음")
    void findById_BndtDeStartingWith_Pagination_NoKeyword() {
         // given
        Duty duty1 = Duty.builder()
                .id(new Duty.DutyId("TEST_ID", "20231001"))
                .frstRegisterId("SYSTEM")
                .build();
        dutyRepository.save(duty1);

        Duty duty2 = Duty.builder()
                .id(new Duty.DutyId("TEST_ID", "20231101"))
                .frstRegisterId("SYSTEM")
                .build();
        dutyRepository.save(duty2);

        // when
        // empty string should match all
        PageRequest pageRequest = PageRequest.of(0, 10);
        Page<Duty> page = dutyRepository.findById_BndtDeStartingWith("", pageRequest);

        // then
        assertThat(page.getTotalElements()).isEqualTo(2);
    }
}
