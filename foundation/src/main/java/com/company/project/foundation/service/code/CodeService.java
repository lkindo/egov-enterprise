package com.company.project.foundation.service.code;

import com.company.project.foundation.core.service.BaseAbstractService;
import com.company.project.foundation.domain.code.CommonCode;
import com.company.project.foundation.domain.code.CommonCodeRepository;
import com.company.project.foundation.service.code.dto.CodeDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.stream.Collectors;

/**
 * JPA 湲곕??듯???붾퉬ы쁽?
 * - ?꾩옄???꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ⑹ * - EgovAbstractServiceImpl ?곸냽
 * ?EgovCodeService ?명꽣??씠ы쁽
 */
@Service("egovCodeService")
@Transactional(readOnly = true)
public class CodeService extends BaseAbstractService implements EgovCodeService {

    private final CommonCodeRepository commonCodeRepository;

    public CodeService(CommonCodeRepository commonCodeRepository) {
        this.commonCodeRepository = required(commonCodeRepository, "commonCodeRepository 은 null 일 수 없습니다");
    }

    /**
     * ?뱀洹몃??붾?CODE_ID)????븳 ?곸꽭 ?붾紐⑸議고??
     */
    @Override
    public List<CodeDto> getDetailCodeList(@NonNull String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(required(codeGroupId, "codeGroupId 는 null 일 수 없습니다"), "Y")
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * ?꾩껜 ??꽦 ?붾紐⑸議고??
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
