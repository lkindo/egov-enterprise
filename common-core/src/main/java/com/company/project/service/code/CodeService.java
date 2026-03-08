package com.company.project.service.code;

import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import com.company.project.service.code.dto.CodeDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * JPA 湲곕??듯???붾??????퉬???ы쁽?
 * - ?꾩옄???꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ?⑹?? * - EgovAbstractServiceImpl ?곸냽 ?EgovCodeService ?명꽣??씠???ы쁽
 */
@Service("egovCodeService")
@Transactional(readOnly = true)
public class CodeService extends EgovAbstractServiceImpl implements EgovCodeService {

    private final CommonCodeRepository commonCodeRepository;

    public CodeService(CommonCodeRepository commonCodeRepository) {
        this.commonCodeRepository = commonCodeRepository;
    }

    /**
     * ?뱀??洹몃??붾?CODE_ID)????븳 ?곸꽭 ?붾?紐⑸?議고??     */
    @Override
    public List<CodeDto> getDetailCodeList(@NonNull String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(Objects.requireNonNull(codeGroupId), "Y")
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * ?꾩껜 ??꽦 ?붾?紐⑸?議고??     */
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
