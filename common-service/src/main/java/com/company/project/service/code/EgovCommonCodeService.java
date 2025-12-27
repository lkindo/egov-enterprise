package com.company.project.service.code;

import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;

import java.util.List;

/**
 * 공통 코드 관리 서비스 인터페이스 (관리자용)
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovCommonCodeService {

    /**
     * 그룹별 코드 목록 조회
     */
    List<CommonCodeDto> getCodesByGroup(String codeGroupId);

    /**
     * 코드 생성
     */
    CommonCodeDto createCode(CommonCodeSaveRequest request);

    // --- 공통분류코드 (CmmnClCode) ---
    List<CmmnClCodeDto> selectCmmnClCodeList(ComDefaultVO searchVO);

    int selectCmmnClCodeListTotCnt(ComDefaultVO searchVO);

    CmmnClCodeDto selectCmmnClCodeDetail(CmmnClCodeDto dto);

    void insertCmmnClCode(CmmnClCodeDto dto);

    void updateCmmnClCode(CmmnClCodeDto dto);

    void deleteCmmnClCode(CmmnClCodeDto dto);

    // --- 공통코드(그룹) (CmmnCode) ---
    List<CmmnCodeDto> selectCmmnCodeList(ComDefaultVO searchVO);

    int selectCmmnCodeListTotCnt(ComDefaultVO searchVO);

    CmmnCodeDto selectCmmnCodeDetail(CmmnCodeDto dto);

    void insertCmmnCode(CmmnCodeDto dto);

    void updateCmmnCode(CmmnCodeDto dto);

    void deleteCmmnCode(CmmnCodeDto dto);

    // --- 공통상세코드 (CmmnDetailCode) ---
    List<CmmnDetailCodeDto> selectCmmnDetailCodeList(ComDefaultVO searchVO);

    int selectCmmnDetailCodeListTotCnt(ComDefaultVO searchVO);

    CmmnDetailCodeDto selectCmmnDetailCodeDetail(CmmnDetailCodeDto dto);

    void insertCmmnDetailCode(CmmnDetailCodeDto dto);

    void updateCmmnDetailCode(CmmnDetailCodeDto dto);

    void deleteCmmnDetailCode(CmmnDetailCodeDto dto);
}
