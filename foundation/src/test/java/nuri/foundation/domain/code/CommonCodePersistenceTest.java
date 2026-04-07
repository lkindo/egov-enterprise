package nuri.foundation.domain.code;

import nuri.foundation.support.PersistenceTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;

class CommonCodePersistenceTest extends PersistenceTestSupport {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private CommonCodeCategoryRepository categoryRepository;

    @Autowired
    private CommonCodeGroupRepository groupRepository;

    @Autowired
    private CommonCodeRepository codeRepository;

    @Test
    @DisplayName("공통분류코드 검색 기능 테스트")
    void searchCommonCodeCategories() {
        // given
        categoryRepository.save(CommonCodeCategory.builder()
                .clCode("C01")
                .clCodeNm("테스트 분류")
                .useAt("Y")
                .build());

        // when
        Page<CommonCodeCategory> result = categoryRepository.searchCommonCodeCategories("2", "테스트", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("공통그룹코드 검색 기능 테스트")
    void searchCommonCodeGroups() {
        // given
        categoryRepository.save(CommonCodeCategory.builder()
                .clCode("C02")
                .clCodeNm("테스트 분류2")
                .useAt("Y")
                .build());

        groupRepository.save(CommonCodeGroup.builder()
                .codeId("G01")
                .codeIdNm("테스트 그룹")
                .clCode("C02")
                .useAt("Y")
                .build());

        // when
        Page<CommonCodeGroupProjection> result = groupRepository.searchCommonCodeGroups("2", "테스트", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("공통상세코드 검색 기능 테스트")
    void searchCommonCodeDetails() {
        // given
        groupRepository.save(CommonCodeGroup.builder()
                .codeId("G02")
                .codeIdNm("테스트 그룹2")
                .clCode("C03")
                .useAt("Y")
                .build());

        codeRepository.save(CommonCode.builder()
                .codeGroupId("G02")
                .code("CODE01")
                .codeNm("테스트 코드")
                .useAt("Y")
                .build());

        // when
        Page<CommonCodeDetailProjection> result = codeRepository.searchCommonCodeDetails("3", "테스트", PageRequest.of(0, 10));

        // then
        assertThat(result.getContent()).isNotEmpty();
    }

    @Test
    @DisplayName("공통분류코드 CRUD 테스트")
    void categoryCrud() {
        // given
        CommonCodeCategory category = CommonCodeCategory.builder()
                .clCode("C99")
                .clCodeNm("CRUD 테스트")
                .build();

        // when: Save
        categoryRepository.save(category);
        categoryRepository.flush();
        entityManager.clear();

        // then: Find
        CommonCodeCategory saved = categoryRepository.findById("C99").orElseThrow();
        assertThat(saved.getClCodeNm()).isEqualTo("CRUD 테스트");

        // when: Update
        saved.update("수정된 이름", "설명", "Y", "ADMIN");
        categoryRepository.save(saved);
        categoryRepository.flush();
        entityManager.clear();

        // then: Verify Update
        CommonCodeCategory updated = categoryRepository.findById("C99").orElseThrow();
        assertThat(updated.getClCodeNm()).isEqualTo("수정된 이름");
    }

    @Test
    @DisplayName("공통그룹코드 CRUD 테스트")
    void groupCrud() {
        // given
        CommonCodeGroup group = CommonCodeGroup.builder()
                .codeId("GRP99")
                .codeIdNm("그룹 테스트")
                .clCode("C01")
                .build();

        // when: Save
        groupRepository.save(group);
        groupRepository.flush();
        entityManager.clear();

        // then: Find
        CommonCodeGroup saved = groupRepository.findById("GRP99").orElseThrow();
        assertThat(saved.getCodeIdNm()).isEqualTo("그룹 테스트");

        // when: Update
        saved.update("수정된 그룹", "설명", "Y", "ADMIN");
        groupRepository.save(saved);
        groupRepository.flush();
        entityManager.clear();

        // then: Verify Update
        CommonCodeGroup updated = groupRepository.findById("GRP99").orElseThrow();
        assertThat(updated.getCodeIdNm()).isEqualTo("수정된 그룹");
    }

    @Test
    @DisplayName("공통상세코드 CRUD 테스트")
    void codeCrud() {
        // given
        CommonCode code = CommonCode.builder()
                .codeGroupId("G01")
                .code("DET99")
                .codeNm("상세 테스트")
                .build();

        // when: Save
        codeRepository.save(code);
        codeRepository.flush();
        entityManager.clear();

        // then: Find
        CommonCodeId id = new CommonCodeId("G01", "DET99");
        CommonCode saved = codeRepository.findById(id).orElseThrow();
        assertThat(saved.getCodeNm()).isEqualTo("상세 테스트");

        // when: Update
        saved.update("수정된 상세", "설명", "Y", "ADMIN");
        codeRepository.save(saved);
        codeRepository.flush();
        entityManager.clear();

        // then: Verify Update
        CommonCode updated = codeRepository.findById(id).orElseThrow();
        assertThat(updated.getCodeNm()).isEqualTo("수정된 상세");
    }
}
