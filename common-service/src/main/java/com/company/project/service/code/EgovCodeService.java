package com.company.project.service.code;

import com.company.project.service.code.dto.CodeDto;

import java.util.List;

/**
 * 공통 코드 관리 서비스 인터페이스
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족을 위한 인터페이스 분리
 */
public interface EgovCodeService {

    /**
     * 특정 그룹 코드에 속한 상세 코드 목록 조회
     */
    List<CodeDto> getDetailCodeList(String codeGroupId);

    /**
     * 전체 활성 코드 목록 조회
     */
    List<CodeDto> getAllActiveCodes();
}
