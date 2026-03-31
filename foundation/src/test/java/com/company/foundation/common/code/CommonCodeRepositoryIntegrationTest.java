package com.company.foundation.common.code;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import com.company.foundation.support.IntegrationTest;

/**
 * CommonCodeRepository 통합 테스트
 * 
 * Testcontainers PostgreSQL 을 사용하여 실제 DB 환경에서 테스트합니다.
 */
@IntegrationTest
@Transactional
class CommonCodeRepositoryIntegrationTest {

    @Autowired
    private CommonCodeRepository commonCodeRepository;

    @Test
    @DisplayName("공통코드를 저장하고 조회할 수 있다")
    void saveAndFindCommonCode() {
        // given
        CommonCode code = new CommonCode();
        code.setCodeId("TEST_ID");
        code.setCodeNm("Test Code Name");
        code.setCodeValue("TEST_VALUE");
        code.setUseAt(true);

        // when
        CommonCode saved = commonCodeRepository.save(code);
        CommonCode found = commonCodeRepository.findById(saved.getId()).orElseThrow();

        // then
        assertThat(found.getCodeId()).isEqualTo("TEST_ID");
        assertThat(found.getCodeNm()).isEqualTo("Test Code Name");
        assertThat(found.getCodeValue()).isEqualTo("TEST_VALUE");
        assertThat(found.isUseAt()).isTrue();
    }

    @Test
    @DisplayName("사용 중인 공통코드만 조회할 수 있다")
    void findByUseAtIsTrue() {
        // given
        CommonCode code1 = createCode("ACTIVE_1", "Active Code 1", true);
        CommonCode code2 = createCode("ACTIVE_2", "Active Code 2", true);
        CommonCode code3 = createCode("INACTIVE_1", "Inactive Code 1", false);

        commonCodeRepository.saveAll(java.util.List.of(code1, code2, code3));

        // when
        var activeCodes = commonCodeRepository.findByUseAtIsTrue();

        // then
        assertThat(activeCodes).hasSize(2);
        assertThat(activeCodes).extracting(CommonCode::getCodeId)
                .containsExactlyInAnyOrder("ACTIVE_1", "ACTIVE_2");
    }

    @Test
    @DisplayName("코드 ID 로 공통코드를 조회할 수 있다")
    void findByCodeId() {
        // given
        String testCodeId = "UNIQUE_CODE_ID";
        CommonCode code = createCode(testCodeId, "Unique Code", true);
        commonCodeRepository.save(code);

        // when
        CommonCode found = commonCodeRepository.findByCodeId(testCodeId).orElseThrow();

        // then
        assertThat(found.getCodeId()).isEqualTo(testCodeId);
        assertThat(found.getCodeNm()).isEqualTo("Unique Code");
    }

    @Test
    @DisplayName("존재하지 않는 코드 ID 를 조회하면 빈 Optional 을 반환한다")
    void findByCodeIdNotFound() {
        // when
        var result = commonCodeRepository.findByCodeId("NON_EXISTENT_ID");

        // then
        assertThat(result).isEmpty();
    }

    private CommonCode createCode(String codeId, String codeNm, boolean useAt) {
        CommonCode code = new CommonCode();
        code.setCodeId(codeId);
        code.setCodeNm(codeNm);
        code.setCodeValue(codeId + "_VALUE");
        code.setUseAt(useAt);
        return code;
    }
}
