package com.company.project.foundation.service.code;

import com.company.project.foundation.service.code.dto.CommonCodeDto;
import com.company.project.foundation.service.code.dto.CommonCodeSaveRequest;
import com.company.project.foundation.service.code.dto.CmmnClCodeDto;
import com.company.project.foundation.service.code.dto.CmmnCodeDto;
import com.company.project.foundation.service.code.dto.CmmnDetailCodeDto;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.lang.NonNull;
import java.util.List;

/**
 * ?듯???붾퉬???명꽣??씠??(ъ옄??
 * - ?꾩옄???꾨젅?꾩썙??5.0 ?명솚???몄쬆 ?붽굔 ⑹꾪븳 ?명꽣??씠???꾨?? */
public interface EgovCommonCodeService {

    /**
     * 洹몃９蹂붾紐⑸議고??     */
    List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId);

    /**
     * ?붾???꽦
     */
    CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request);

    // --- ?듯遺꾨쪟?붾?(CmmnClCode) ---
    List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnClCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto);

    void insertCmmnClCode(@NonNull CmmnClCodeDto dto);

    void updateCmmnClCode(@NonNull CmmnClCodeDto dto);

    void deleteCmmnClCode(@NonNull CmmnClCodeDto dto);

    // --- ?듯肄붾뱶(洹몃? (CmmnCode) ---
    List<CmmnCodeDto> selectCmmnCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto);

    void insertCmmnCode(@NonNull CmmnCodeDto dto);

    void updateCmmnCode(@NonNull CmmnCodeDto dto);

    void deleteCmmnCode(@NonNull CmmnCodeDto dto);

    // --- ?듯??곸꽭?붾?(CmmnDetailCode) ---
    List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnDetailCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto);

    void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);
}
