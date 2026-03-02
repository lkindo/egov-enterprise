package com.company.project.domain.vacation;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("VacationRepository 테스트")
class VacationRepositoryTest {

    @Autowired
    private VacationRepository vacationRepository;

    @Test
    @DisplayName("휴가 정보 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        Vacation vacation = Vacation.builder()
                .applcntId("USR_0001")
                .vcatnSe("01") // 연차
                .bgnde("2026-03-10")
                .endde("2026-03-12")
                .reqstDe("2026-03-01")
                .vcatnResn("개인 사정")
                .occrrncYear("2026")
                .noonSe("1") // 오전
                .confmAt("N")
                .build();

        // When
        vacationRepository.save(vacation);
        VacationId id = new VacationId("USR_0001", "01", "2026-03-10");
        Optional<Vacation> found = vacationRepository.findById(id);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getVcatnResn()).isEqualTo("개인 사정");
        assertThat(found.get().getNoonSe()).isEqualTo("1");
        assertThat(found.get().getEndde()).isEqualTo("2026-03-12");
        assertThat(found.get().getReqstDe()).isEqualTo("2026-03-01");
    }

    @Test
    @DisplayName("사용자별 휴가 신청 목록 조회 확인")
    void findByApplcntId() {
        // Given
        vacationRepository.save(Vacation.builder().applcntId("USER1").vcatnSe("01").bgnde("2026-01-01").build());
        vacationRepository.save(Vacation.builder().applcntId("USER1").vcatnSe("02").bgnde("2026-02-01").build());
        vacationRepository.save(Vacation.builder().applcntId("USER2").vcatnSe("01").bgnde("2026-03-01").build());

        // When
        Page<Vacation> result = vacationRepository.findByApplcntId("USER1", PageRequest.of(0, 10));

        // Then
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("휴가 승인 정보 수정 확인")
    void updateVacationStatus() {
        // Given
        Vacation vacation = Vacation.builder()
                .applcntId("USER3")
                .vcatnSe("01")
                .bgnde("2026-04-01")
                .confmAt("N")
                .build();
        vacationRepository.save(vacation);

        // When
        Vacation saved = vacationRepository.findById(new VacationId("USER3", "01", "2026-04-01")).orElseThrow();
        saved.setConfmAt("Y");
        saved.setSanctnerId("ADMIN");
        saved.setSanctnDt("2026-03-02 22:00:00");
        saved.setReturnResn("Approved");
        saved.setInfrmlSanctnId("IS_001");
        vacationRepository.saveAndFlush(saved);

        // Then
        Vacation updated = vacationRepository.findById(new VacationId("USER3", "01", "2026-04-01")).orElseThrow();
        assertThat(updated.getConfmAt()).isEqualTo("Y");
        assertThat(updated.getSanctnerId()).isEqualTo("ADMIN");
        assertThat(updated.getReturnResn()).isEqualTo("Approved");
        assertThat(updated.getInfrmlSanctnId()).isEqualTo("IS_001");
    }
}
