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
@DisplayName("AnnualLeaveRepository 테스트")
class AnnualLeaveRepositoryTest {

    @Autowired
    private AnnualLeaveRepository annualLeaveRepository;

    @Test
    @DisplayName("개인별 연차 정보 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        AnnualLeave annualLeave = AnnualLeave.builder()
                .occrrncYear("2026")
                .userId("USR_0001")
                .occrncYrycCo(15.0)
                .useYrycCo(2.0)
                .remndrYrycCo(13.0)
                .build();

        // When
        annualLeaveRepository.save(annualLeave);
        AnnualLeaveId id = new AnnualLeaveId("2026", "USR_0001");
        Optional<AnnualLeave> found = annualLeaveRepository.findById(id);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getOccrncYrycCo()).isEqualTo(15.0);
        assertThat(found.get().getOccrrncYear()).isEqualTo("2026");
        assertThat(found.get().getUserId()).isEqualTo("USR_0001");
    }

    @Test
    @DisplayName("연차 차감 로직 확인")
    void deductLeave() {
        // Given
        AnnualLeave annualLeave = AnnualLeave.builder()
                .occrrncYear("2026")
                .userId("USR_0002")
                .occrncYrycCo(20.0)
                .useYrycCo(0.0)
                .remndrYrycCo(20.0)
                .build();
        annualLeaveRepository.save(annualLeave);

        // When
        AnnualLeave saved = annualLeaveRepository.findById(new AnnualLeaveId("2026", "USR_0002")).orElseThrow();
        saved.deductLeave(1.5);
        annualLeaveRepository.saveAndFlush(saved);

        // Then
        AnnualLeave updated = annualLeaveRepository.findById(new AnnualLeaveId("2026", "USR_0002")).orElseThrow();
        assertThat(updated.getUseYrycCo()).isEqualTo(1.5);
        assertThat(updated.getRemndrYrycCo()).isEqualTo(18.5);
    }

    @Test
    @DisplayName("잔여 연차 동기화 로직 확인")
    void syncRemaining() {
        // Given
        AnnualLeave annualLeave = AnnualLeave.builder()
                .occrrncYear("2026")
                .userId("USR_0003")
                .occrncYrycCo(15.0)
                .useYrycCo(5.0)
                .build();

        // When
        annualLeave.syncRemaining();

        // Then
        assertThat(annualLeave.getRemndrYrycCo()).isEqualTo(10.0);

        // Edge case: null values
        AnnualLeave empty = AnnualLeave.builder().occrrncYear("2026").userId("EMPTY").build();
        empty.syncRemaining();
        assertThat(empty.getOccrncYrycCo()).isEqualTo(0.0);
        assertThat(empty.getUseYrycCo()).isEqualTo(0.0);
        assertThat(empty.getRemndrYrycCo()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("발생 연도별 조회 확인")
    void findByOccrrncYear() {
        // Given
        annualLeaveRepository.save(AnnualLeave.builder().occrrncYear("2025").userId("USER1").build());
        annualLeaveRepository.save(AnnualLeave.builder().occrrncYear("2026").userId("USER1").build());
        annualLeaveRepository.save(AnnualLeave.builder().occrrncYear("2026").userId("USER2").build());

        // When
        Page<AnnualLeave> result = annualLeaveRepository.findByOccrrncYear("2026", PageRequest.of(0, 10));

        // Then
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("연차 정보 수정 로직 확인")
    void updateAnnualLeave() {
        // Given
        AnnualLeave annualLeave = AnnualLeave.builder()
                .occrrncYear("2026")
                .userId("USR_0004")
                .occrncYrycCo(15.0)
                .build();
        annualLeaveRepository.save(annualLeave);

        // When
        AnnualLeave saved = annualLeaveRepository.findById(new AnnualLeaveId("2026", "USR_0004")).orElseThrow();
        saved.setOccrncYrycCo(18.0);
        saved.syncRemaining();
        annualLeaveRepository.saveAndFlush(saved);

        // Then
        AnnualLeave updated = annualLeaveRepository.findById(new AnnualLeaveId("2026", "USR_0004")).orElseThrow();
        assertThat(updated.getOccrncYrycCo()).isEqualTo(18.0);
        assertThat(updated.getRemndrYrycCo()).isEqualTo(18.0);
    }
}
