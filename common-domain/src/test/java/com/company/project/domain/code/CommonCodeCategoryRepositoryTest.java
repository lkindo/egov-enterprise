package com.company.project.domain.code;

import com.company.project.TestJpaConfig;
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
@DisplayName("CommonCodeCategoryRepository 테스트")
class CommonCodeCategoryRepositoryTest {

    @Autowired
    private CommonCodeCategoryRepository commonCodeCategoryRepository;

    @Test
    @DisplayName("공통코드분류 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        CommonCodeCategory category = CommonCodeCategory.builder()
                .clCode("CL1")
                .clCodeNm("테스트분류")
                .clCodeDc("분류설명")
                .useAt("Y")
                .frstRegisterId("admin")
                .build();

        // When
        commonCodeCategoryRepository.save(category);
        Optional<CommonCodeCategory> found = commonCodeCategoryRepository.findById("CL1");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getClCodeNm()).isEqualTo("테스트분류");
    }

    @Test
    @DisplayName("공통코드분류 수정 및 소프트 삭제 확인")
    void updateAndDelete() {
        // Given
        CommonCodeCategory category = CommonCodeCategory.builder()
                .clCode("CL1")
                .clCodeNm("이전명")
                .useAt("Y")
                .build();
        commonCodeCategoryRepository.save(category);

        // When: Update
        CommonCodeCategory saved = commonCodeCategoryRepository.findById("CL1").orElseThrow();
        saved.update("새이름", "분류설명수정", "N", "user1");
        commonCodeCategoryRepository.saveAndFlush(saved);

        // Then: Update Check
        CommonCodeCategory updated = commonCodeCategoryRepository.findById("CL1").orElseThrow();
        assertThat(updated.getClCodeNm()).isEqualTo("새이름");
        assertThat(updated.getUseAt()).isEqualTo("N");

        // When: Soft Delete
        updated.delete();
        commonCodeCategoryRepository.saveAndFlush(updated);

        // Then: Soft Delete Check
        CommonCodeCategory deleted = commonCodeCategoryRepository.findById("CL1").orElseThrow();
        assertThat(deleted.getUseAt()).isEqualTo("N");
    }
}
