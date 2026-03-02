package com.company.project.domain.code;

import com.company.project.TestJpaConfig;
import com.company.project.domain.code.AdministCode.AdministCodeId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("AdministCodeRepository 테스트")
class AdministCodeRepositoryTest {

    @Autowired
    private AdministCodeRepository administCodeRepository;

    @Test
    @DisplayName("행정코드 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        AdministCodeId id = AdministCodeId.builder()
                .administZoneSe("1")
                .administZoneCode("CODE001")
                .build();

        AdministCode administCode = AdministCode.builder()
                .id(id)
                .administZoneNm("테스트지역")
                .useAt("Y")
                .frstRegisterId("admin")
                .build();

        // When
        administCodeRepository.save(administCode);
        Optional<AdministCode> found = administCodeRepository.findById(id);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getAdministZoneNm()).isEqualTo("테스트지역");
        assertThat(found.get().getId().getAdministZoneCode()).isEqualTo("CODE001");
    }

    @Test
    @DisplayName("행정코드 정보 수정 확인")
    void updateAdministCode() {
        // Given
        AdministCodeId id = AdministCodeId.builder()
                .administZoneSe("1")
                .administZoneCode("CODE001")
                .build();

        AdministCode administCode = AdministCode.builder()
                .id(id)
                .administZoneNm("이전지역명")
                .useAt("Y")
                .frstRegisterId("admin")
                .build();
        administCodeRepository.save(administCode);

        // When
        AdministCode saved = administCodeRepository.findById(id).orElseThrow();
        saved.update("수정지역명", "UPPER001", "20240101", null, "Y", "user1");
        administCodeRepository.saveAndFlush(saved);

        // Then
        AdministCode updated = administCodeRepository.findById(id).orElseThrow();
        assertThat(updated.getAdministZoneNm()).isEqualTo("수정지역명");
        assertThat(updated.getUpperAdministZoneCode()).isEqualTo("UPPER001");
        assertThat(updated.getLastUpdusrId()).isEqualTo("user1");
    }

    @Test
    @DisplayName("행정코드 소프트 삭제(사용여부 N) 확인")
    void deleteAdministCode() {
        // Given
        AdministCodeId id = AdministCodeId.builder()
                .administZoneSe("1")
                .administZoneCode("CODE001")
                .build();

        AdministCode administCode = AdministCode.builder()
                .id(id)
                .administZoneNm("테스트지역")
                .useAt("Y")
                .frstRegisterId("admin")
                .build();
        administCodeRepository.save(administCode);

        // When
        AdministCode saved = administCodeRepository.findById(id).orElseThrow();
        saved.softDelete("20241231");
        administCodeRepository.saveAndFlush(saved);

        // Then
        AdministCode deleted = administCodeRepository.findById(id).orElseThrow();
        assertThat(deleted.getUseAt()).isEqualTo("N");
        assertThat(deleted.getAblDe()).isEqualTo("20241231");
    }
}
