package com.company.project.service.code;

import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import com.company.project.service.code.dto.CodeDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * JPA 기반 공통 코드 관리 서비스 구현체
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족
 * - EgovAbstractServiceImpl 상속 및 EgovCodeService 인터페이스 구현
 */
@Service("egovCodeService")
@Transactional(readOnly = true)
public class CodeService extends EgovAbstractServiceImpl implements EgovCodeService {

    private final CommonCodeRepository commonCodeRepository;

    public CodeService(CommonCodeRepository commonCodeRepository) {
        this.commonCodeRepository = commonCodeRepository;
    }

    /**
     * 특정 그룹 코드(CODE_ID)에 속한 상세 코드 목록 조회
     */
    @Override
    public List<CodeDto> getDetailCodeList(String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(codeGroupId, "Y").stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 전체 활성 코드 목록 조회
     */
    @Override
    public List<CodeDto> getAllActiveCodes() {
        return commonCodeRepository.findAll().stream()
                .filter(code -> "Y".equals(code.getUseAt()))
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private CodeDto convertToDto(CommonCode code) {
        return CodeDto.builder()
                .codeGroupId(code.getCodeGroupId())
                .code(code.getCode())
                .codeNm(code.getCodeNm())
                .codeDc(code.getCodeDc())
                .useAt(code.getUseAt())
                .build();
    }
}
