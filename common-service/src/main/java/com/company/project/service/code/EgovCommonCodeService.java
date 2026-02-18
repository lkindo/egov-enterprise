package com.company.project.service.code;

import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.lang.NonNull;

import java.util.List;

/**
 * 공통 코드 관리 서비스 인터페이스 (관리자용)
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovCommonCodeService {

    /**
     * 그룹별 코드 목록 조회
     */
    List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId);

    /**
     * 코드 생성
     */
    CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request);

    // --- 공통분류코드 (CmmnClCode) ---
    List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnClCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto);

    void insertCmmnClCode(@NonNull CmmnClCodeDto dto);

    void updateCmmnClCode(@NonNull CmmnClCodeDto dto);

    void deleteCmmnClCode(@NonNull CmmnClCodeDto dto);

    // --- 공통코드(그룹) (CmmnCode) ---
    List<CmmnCodeDto> selectCmmnCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto);

    void insertCmmnCode(@NonNull CmmnCodeDto dto);

    void updateCmmnCode(@NonNull CmmnCodeDto dto);

    void deleteCmmnCode(@NonNull CmmnCodeDto dto);

    // --- 공통상세코드 (CmmnDetailCode) ---
    List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnDetailCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto);

    void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);
}
