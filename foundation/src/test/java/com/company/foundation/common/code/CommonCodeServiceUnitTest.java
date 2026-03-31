package com.company.foundation.common.code;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * CommonCodeService 단위 테스트
 * 
 * Mock 을 사용하여 Service 로직만 테스트합니다.
 */
@ExtendWith(MockitoExtension.class)
class CommonCodeServiceUnitTest {

    @Mock
    private CommonCodeRepository commonCodeRepository;

    @InjectMocks
    private CommonCodeService commonCodeService;

    @Test
    @DisplayName("코드 ID 로 공통코드를 조회한다")
    void findByCodeId() {
        // given
        String testCodeId = "TEST_CODE";
        CommonCode mockCode = createMockCode(testCodeId, "Test Code Name");
        
        given(commonCodeRepository.findByCodeId(testCodeId)).willReturn(Optional.of(mockCode));

        // when
        CommonCode result = commonCodeService.findByCodeId(testCodeId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getCodeId()).isEqualTo(testCodeId);
        assertThat(result.getCodeNm()).isEqualTo("Test Code Name");
        then(commonCodeRepository).should().findByCodeId(testCodeId);
    }

    @Test
    @DisplayName("존재하지 않는 코드 ID 로 조회하면 null 을 반환한다")
    void findByCodeIdNotFound() {
        // given
        String nonExistentId = "NON_EXISTENT";
        given(commonCodeRepository.findByCodeId(nonExistentId)).willReturn(Optional.empty());

        // when
        CommonCode result = commonCodeService.findByCodeId(nonExistentId);

        // then
        assertThat(result).isNull();
        then(commonCodeRepository).should().findByCodeId(nonExistentId);
    }

    @Test
    @DisplayName("공통코드를 저장한다")
    void saveCommonCode() {
        // given
        CommonCode codeToSave = createMockCode("NEW_CODE", "New Code");
        CommonCode savedCode = createMockCode("NEW_CODE", "New Code");
        
        given(commonCodeRepository.save(any(CommonCode.class))).willReturn(savedCode);

        // when
        CommonCode result = commonCodeService.save(codeToSave);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getCodeId()).isEqualTo("NEW_CODE");
        then(commonCodeRepository).should().save(codeToSave);
    }

    @Test
    @DisplayName("사용 중인 공통코드 목록을 조회한다")
    void findActiveCodes() {
        // given
        var activeCodes = java.util.List.of(
            createMockCode("CODE1", "Code 1"),
            createMockCode("CODE2", "Code 2")
        );
        
        given(commonCodeRepository.findByUseAtIsTrue()).willReturn(activeCodes);

        // when
        var result = commonCodeService.findActiveCodes();

        // then
        assertThat(result).hasSize(2);
        then(commonCodeRepository).should().findByUseAtIsTrue();
    }

    @Test
    @DisplayName("공통코드를 삭제한다")
    void deleteCommonCode() {
        // given
        Long codeId = 1L;
        CommonCode mockCode = createMockCode("CODE_TO_DELETE", "Code to Delete");
        mockCode.setId(codeId);
        
        given(commonCodeRepository.findById(codeId)).willReturn(Optional.of(mockCode));
        willDoNothing().given(commonCodeRepository).delete(mockCode);

        // when
        commonCodeService.deleteCommonCode(codeId);

        // then
        then(commonCodeRepository).should().findById(codeId);
        then(commonCodeRepository).should().delete(mockCode);
    }

    private CommonCode createMockCode(String codeId, String codeNm) {
        CommonCode code = new CommonCode();
        code.setCodeId(codeId);
        code.setCodeNm(codeNm);
        code.setCodeValue(codeId + "_VALUE");
        code.setUseAt(true);
        return code;
    }
}
