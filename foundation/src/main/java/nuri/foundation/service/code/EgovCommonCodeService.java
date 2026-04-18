package nuri.foundation.service.code;

import nuri.foundation.service.code.dto.CommonCodeDto;
import nuri.foundation.service.code.dto.CommonCodeSaveRequest;
import nuri.foundation.service.code.dto.CmmnClCodeDto;
import nuri.foundation.service.code.dto.CmmnCodeDto;
import nuri.foundation.service.code.dto.CmmnDetailCodeDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.springframework.lang.NonNull;
import java.util.List;

/**
 * 공통코드 서비스 인터페이스 (확장형)
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건을 충족하기 위한 인터페이스 정의
 */
public interface EgovCommonCodeService {

    /**
     * 그룹별 코드 조회
     */
    List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId);

    /**
     * 코드 생성
     */
    CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request);

    // --- 공통분류코드 (CmmnClCode) ---
    List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull BaseSearchDto searchVO);

    int selectCmmnClCodeListTotCnt(@NonNull BaseSearchDto searchVO);

    CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto);

    void insertCmmnClCode(@NonNull CmmnClCodeDto dto);

    void updateCmmnClCode(@NonNull CmmnClCodeDto dto);

    void deleteCmmnClCode(@NonNull CmmnClCodeDto dto);

    // --- 공통코드 (CmmnCode) ---
    List<CmmnCodeDto> selectCmmnCodeList(@NonNull BaseSearchDto searchVO);

    int selectCmmnCodeListTotCnt(@NonNull BaseSearchDto searchVO);

    CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto);

    void insertCmmnCode(@NonNull CmmnCodeDto dto);

    void updateCmmnCode(@NonNull CmmnCodeDto dto);

    void deleteCmmnCode(@NonNull CmmnCodeDto dto);

    // --- 공통상세코드 (CmmnDetailCode) ---
    List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull BaseSearchDto searchVO);

    int selectCmmnDetailCodeListTotCnt(@NonNull BaseSearchDto searchVO);

    CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto);

    void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);
}
