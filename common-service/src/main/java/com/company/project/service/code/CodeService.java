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
 * JPA 湲곕컲 怨듯넻 肄붾뱶 愿由??쒕퉬??援ы쁽泥?
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”
 * - EgovAbstractServiceImpl ?곸냽 諛?EgovCodeService ?명꽣?섏씠??援ы쁽
 */
@Service("egovCodeService")
@Transactional(readOnly = true)
public class CodeService extends EgovAbstractServiceImpl implements EgovCodeService {

    private final CommonCodeRepository commonCodeRepository;

    public CodeService(CommonCodeRepository commonCodeRepository) {
        this.commonCodeRepository = commonCodeRepository;
    }

    /**
     * ?뱀젙 洹몃９ 肄붾뱶(CODE_ID)???랁븳 ?곸꽭 肄붾뱶 紐⑸줉 議고쉶
     */
    @Override
    public List<CodeDto> getDetailCodeList(@NonNull String codeGroupId) {
        return commonCodeRepository.findByCodeGroupIdAndUseAt(Objects.requireNonNull(codeGroupId), "Y")
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * ?꾩껜 ?쒖꽦 肄붾뱶 紐⑸줉 議고쉶
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
