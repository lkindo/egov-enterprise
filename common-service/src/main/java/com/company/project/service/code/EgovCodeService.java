package com.company.project.service.code;

import com.company.project.service.code.dto.CodeDto;

import java.util.List;

/**
 * 怨듯넻 肄붾뱶 愿由??쒕퉬???명꽣?섏씠??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovCodeService {

    /**
     * ?뱀젙 洹몃９ 肄붾뱶???랁븳 ?곸꽭 肄붾뱶 紐⑸줉 議고쉶
     */
    List<CodeDto> getDetailCodeList(@org.springframework.lang.NonNull String codeGroupId);

    /**
     * ?꾩껜 ?쒖꽦 肄붾뱶 紐⑸줉 議고쉶
     */
    List<CodeDto> getAllActiveCodes();
}
