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
@DisplayName("CommonCodeGroupRepository 테스트")
class CommonCodeGroupRepositoryTest {

    @Autowired
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @Test
    @DisplayName("공통코드그룹 저장 및 조회 확인")
    void saveAndFindById() {
        // Given
        CommonCodeGroup group = CommonCodeGroup.builder()
                .codeId("GROUP001")
                .codeIdNm("테스트그룹")
                .clCode("CL1")
                .useAt("Y")
                .frstRegisterId("admin")
                .build();

        // When
        commonCodeGroupRepository.save(group);
        Optional<CommonCodeGroup> found = commonCodeGroupRepository.findById("GROUP001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getCodeIdNm()).isEqualTo("테스트그룹");
        assertThat(found.get().getClCode()).isEqualTo("CL1");
    }

    @Test
    @DisplayName("공통코드그룹 수정 및 소프트 삭제 확인")
    void updateAndDelete() {
        // Given
        CommonCodeGroup group = CommonCodeGroup.builder()
                .codeId("GROUP001")
                .codeIdNm("이전명")
                .useAt("Y")
                .build();
        commonCodeGroupRepository.save(group);

        // When: Update
        CommonCodeGroup saved = commonCodeGroupRepository.findById("GROUP001").orElseThrow();
        saved.update("새이름", "설명수정", "N", "user1");
        commonCodeGroupRepository.saveAndFlush(saved);

        // Then: Update Check
        CommonCodeGroup updated = commonCodeGroupRepository.findById("GROUP001").orElseThrow();
        assertThat(updated.getCodeIdNm()).isEqualTo("새이름");
        assertThat(updated.getUseAt()).isEqualTo("N");

        // When: Soft Delete
        updated.delete();
        commonCodeGroupRepository.saveAndFlush(updated);

        // Then: Soft Delete Check
        CommonCodeGroup deleted = commonCodeGroupRepository.findById("GROUP001").orElseThrow();
        assertThat(deleted.getUseAt()).isEqualTo("N");
    }
}
