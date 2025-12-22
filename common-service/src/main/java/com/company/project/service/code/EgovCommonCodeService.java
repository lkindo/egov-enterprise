package com.company.project.service.code;

import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;

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
}
