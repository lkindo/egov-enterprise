package com.company.project.domain.code;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("CommonCodeRepository 테스트")
class CommonCodeRepositoryTest {

    @Autowired
    private CommonCodeRepository commonCodeRepository;

    @Autowired
    private CommonCodeGroupRepository commonCodeGroupRepository;

    @Test
    @DisplayName("공통코드 상세 검색 (QueryDSL) 확인")
    void searchCommonCodeDetails() {
        // Given
        CommonCodeGroup group = CommonCodeGroup.builder()
                .codeId("G1")
                .codeIdNm("GroupOne")
                .useAt("Y")
                .build();
        commonCodeGroupRepository.save(group);

        CommonCode code1 = CommonCode.builder()
                .codeGroupId("G1")
                .code("C1")
                .codeNm("Apple")
                .useAt("Y")
                .build();
        CommonCode code2 = CommonCode.builder()
                .codeGroupId("G1")
                .code("C2")
                .codeNm("Banana")
                .useAt("Y")
                .build();
        commonCodeRepository.saveAll(List.of(code1, code2));

        // When
        Page<CommonCodeDetailProjection> result = commonCodeRepository.searchCommonCodeDetails("3", "Apple",
                PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCodeNm()).isEqualTo("Apple");
        assertThat(result.getContent().get(0).getCodeIdNm()).isEqualTo("GroupOne");
    }

    @Test
    @DisplayName("공통코드 저장 및 복합키 조회 확인")
    void saveAndFindById() {
        // Given
        CommonCode commonCode = CommonCode.builder()
                .codeGroupId("GROUP001")
                .code("CODE001")
                .codeNm("테스트코드")
                .codeDc("테스트 설명")
                .useAt("Y")
                .frstRegisterId("admin")
                .build();

        // When
        commonCodeRepository.save(commonCode);

        CommonCodeId id = new CommonCodeId("GROUP001", "CODE001");
        Optional<CommonCode> found = commonCodeRepository.findById(id);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getCodeNm()).isEqualTo("테스트코드");
        assertThat(found.get().getCodeGroupId()).isEqualTo("GROUP001");
    }

    @Test
    @DisplayName("그룹아이디와 사용여부로 목록 조회 확인")
    void findByCodeGroupIdAndUseAt() {
        // Given
        commonCodeRepository.save(CommonCode.builder()
                .codeGroupId("G1")
                .code("C1")
                .codeNm("N1")
                .useAt("Y")
                .build());
        commonCodeRepository.save(CommonCode.builder()
                .codeGroupId("G1")
                .code("C2")
                .codeNm("N2")
                .useAt("N")
                .build());

        // When
        List<List<CommonCode>> results = List.of(
                commonCodeRepository.findByCodeGroupIdAndUseAt("G1", "Y"),
                commonCodeRepository.findByCodeGroupIdAndUseAt("G1", "N"));

        // Then
        assertThat(results.get(0)).hasSize(1);
        assertThat(results.get(0).get(0).getCode()).isEqualTo("C1");
        assertThat(results.get(1)).hasSize(1);
        assertThat(results.get(1).get(0).getCode()).isEqualTo("C2");
    }

    @Test
    @DisplayName("공통코드 정보 수정 및 삭제 확인")
    void updateAndDelete() {
        // Given
        CommonCode commonCode = CommonCode.builder()
                .codeGroupId("G1")
                .code("C1")
                .codeNm("OldName")
                .useAt("Y")
                .build();
        commonCodeRepository.save(commonCode);
        CommonCodeId id = new CommonCodeId("G1", "C1");

        // When: Update
        CommonCode saved = commonCodeRepository.findById(id).orElseThrow();
        saved.update("NewName", "NewDesc", "N", "user1");
        commonCodeRepository.saveAndFlush(saved);

        // Then: Update Check
        CommonCode updated = commonCodeRepository.findById(id).orElseThrow();
        assertThat(updated.getCodeNm()).isEqualTo("NewName");
        assertThat(updated.getUseAt()).isEqualTo("N");

        // When: Soft Delete
        updated.delete();
        commonCodeRepository.saveAndFlush(updated);

        // Then: Soft Delete Check
        CommonCode deleted = commonCodeRepository.findById(id).orElseThrow();
        assertThat(deleted.getUseAt()).isEqualTo("N");
    }
}
