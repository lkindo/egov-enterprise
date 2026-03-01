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
 * ?¨ë“¯???„ë¶¾ë±??¿Â€????•í‰¬???ëª…ê½£??ì” ??(?¿Â€?±ÑŠì˜„??
 * - ?ê¾©ì˜„?ëº??ê¾¨ì …?ê¾©ì™??5.0 ?ëª…ì†š???ëª„ì¬† ?ë¶½êµ” ?°â‘¹????ê¾ªë¸³ ?ëª…ê½£??ì” ???ºê¾¨?? */
public interface EgovCommonCodeService {

    /**
     * æ´¹ëªƒï¼™è¹‚??„ë¶¾ë±?ï§â‘¸ì¤?è­°ê³ ??     */
    List<CommonCodeDto> getCodesByGroup(@NonNull String codeGroupId);

    /**
     * ?„ë¶¾ë±???¹ê½¦
     */
    CommonCodeDto createCode(@NonNull CommonCodeSaveRequest request);

    // --- ?¨ë“¯?»éºê¾¨ìªŸ?„ë¶¾ë±?(CmmnClCode) ---
    List<CmmnClCodeDto> selectCmmnClCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnClCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnClCodeDto selectCmmnClCodeDetail(@NonNull CmmnClCodeDto dto);

    void insertCmmnClCode(@NonNull CmmnClCodeDto dto);

    void updateCmmnClCode(@NonNull CmmnClCodeDto dto);

    void deleteCmmnClCode(@NonNull CmmnClCodeDto dto);

    // --- ?¨ë“¯?»è‚„ë¶¾ë±¶(æ´¹ëªƒï¼? (CmmnCode) ---
    List<CmmnCodeDto> selectCmmnCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnCodeDto selectCmmnCodeDetail(@NonNull CmmnCodeDto dto);

    void insertCmmnCode(@NonNull CmmnCodeDto dto);

    void updateCmmnCode(@NonNull CmmnCodeDto dto);

    void deleteCmmnCode(@NonNull CmmnCodeDto dto);

    // --- ?¨ë“¯??ê³¸ê½­?„ë¶¾ë±?(CmmnDetailCode) ---
    List<CmmnDetailCodeDto> selectCmmnDetailCodeList(@NonNull ComDefaultVO searchVO);

    int selectCmmnDetailCodeListTotCnt(@NonNull ComDefaultVO searchVO);

    CmmnDetailCodeDto selectCmmnDetailCodeDetail(@NonNull CmmnDetailCodeDto dto);

    void insertCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void updateCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);

    void deleteCmmnDetailCode(@NonNull CmmnDetailCodeDto dto);
}
