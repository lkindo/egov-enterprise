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
 * 怨듯넻 肄붾뱶 愿由??쒕퉬???명꽣?섏씠??(愿由ъ옄??
 * - ?꾩옄?뺣??꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 異⑹”???꾪븳 ?명꽣?섏씠??遺꾨━
 */
public interface EgovCommonCodeService {

    /**
     * 洹몃９蹂?肄붾뱶 紐⑸줉 議고쉶
     */
    List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId);

    /**
     * 肄붾뱶 ?앹꽦
     */
    CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request);

    // --- 怨듯넻遺꾨쪟肄붾뱶 (CmmnClCode) ---
    List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnClCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto);

    void insertCmmnClCode(@NonNull CmmnClCodeDto dto);

    void updateCmmnClCode(@NonNull CmmnClCodeDto dto);

    void deleteCmmnClCode(@NonNull CmmnClCodeDto dto);

    // --- 怨듯넻肄붾뱶(洹몃９) (CmmnCode) ---
    List<CmmnCodeDto> selectCmmnCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto);

    void insertCmmnCode(@NonNull CmmnCodeDto dto);

    void updateCmmnCode(@NonNull CmmnCodeDto dto);

    void deleteCmmnCode(@NonNull CmmnCodeDto dto);

    // --- 怨듯넻?곸꽭肄붾뱶 (CmmnDetailCode) ---
    List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnDetailCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto);

    void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);
}
