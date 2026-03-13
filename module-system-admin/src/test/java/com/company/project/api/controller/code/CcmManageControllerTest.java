package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;
import com.company.project.service.code.dto.CommonCodeDto;
import com.company.project.service.code.dto.CommonCodeSaveRequest;
import com.company.project.security.service.CustomUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import java.util.ArrayList;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CcmManageController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CcmManageController 테스트")
class CcmManageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CommonCodeService commonCodeService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @BeforeEach
    void setUp() {
        CustomUserDetails userDetails = CustomUserDetails.builder()
                .userId("admin")
                .esntlId("USR_001")
                .build();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, new ArrayList<>());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // =====================================================
    // 공통분류코드 (CmmnClCode)
    // =====================================================

    @Test
    @DisplayName("공통분류코드 목록 조회 성공")
    void selectCmmnClCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnClCodeList(any())).willReturn(Collections.emptyList());
        given(commonCodeService.selectCmmnClCodeListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/sym/ccm/ccc/EgovCcmCmmnClCodeList.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnClCodeList"))
                .andExpect(model().attributeExists("resultList"))
                .andExpect(model().attributeExists("paginationInfo"));
    }

    @Test
    @DisplayName("공통분류코드 상세 조회 성공")
    void selectCmmnClCodeDetail_Success() throws Exception {
        given(commonCodeService.selectCmmnClCodeDetail(any())).willReturn(new CmmnClCodeDto());

        mockMvc.perform(get("/sym/ccm/ccc/EgovCcmCmmnClCodeDetail.do")
                .param("clCode", "CL1"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnClCodeDetail"))
                .andExpect(model().attributeExists("result"));
    }

    @Test
    @DisplayName("공통분류코드 등록 뷰 성공")
    void insertCmmnClCodeView_Success() throws Exception {
        mockMvc.perform(get("/sym/ccm/ccc/EgovCcmCmmnClCodeRegist.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnClCodeRegist"))
                .andExpect(model().attributeExists("cmmnClCode"));
    }

    @Test
    @DisplayName("공통분류코드 등록 성공")
    void insertCmmnClCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/ccc/EgovCcmCmmnClCodeRegist.do")
                .param("clCode", "CL1")
                .param("clCodeNm", "New Category")
                .param("useAt", "Y")
                .param("clCodeDc", "Description"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/ccc/EgovCcmCmmnClCodeList.do"));
    }

    @Test
    @DisplayName("공통분류코드 수정 뷰 성공")
    void updateCmmnClCodeView_Success() throws Exception {
        given(commonCodeService.selectCmmnClCodeDetail(any())).willReturn(new CmmnClCodeDto());

        mockMvc.perform(get("/sym/ccm/ccc/EgovCcmCmmnClCodeModify.do")
                .param("clCode", "CL1"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnClCodeModify"))
                .andExpect(model().attributeExists("cmmnClCode"));
    }

    @Test
    @DisplayName("공통분류코드 수정 성공")
    void updateCmmnClCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/ccc/EgovCcmCmmnClCodeModify.do")
                .param("clCode", "CL1")
                .param("clCodeNm", "Updated Category")
                .param("useAt", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/ccc/EgovCcmCmmnClCodeList.do"));
    }

    @Test
    @DisplayName("공통분류코드 삭제 성공")
    void deleteCmmnClCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/ccc/EgovCcmCmmnClCodeRemove.do")
                .param("clCode", "CL1"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/ccc/EgovCcmCmmnClCodeList.do"));
    }

    // =====================================================
    // 공통코드 (CmmnCode)
    // =====================================================

    @Test
    @DisplayName("공통코드 목록 조회 성공")
    void selectCmmnCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnCodeList(any())).willReturn(Collections.emptyList());
        given(commonCodeService.selectCmmnCodeListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/sym/ccm/cca/EgovCcmCmmnCodeList.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnCodeList"))
                .andExpect(model().attributeExists("resultList"))
                .andExpect(model().attributeExists("paginationInfo"));
    }

    @Test
    @DisplayName("공통코드 상세 조회 성공")
    void selectCmmnCodeDetail_Success() throws Exception {
        given(commonCodeService.selectCmmnCodeDetail(any())).willReturn(new CmmnCodeDto());

        mockMvc.perform(get("/sym/ccm/cca/EgovCcmCmmnCodeDetail.do")
                .param("codeId", "CD1"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnCodeDetail"))
                .andExpect(model().attributeExists("result"));
    }

    @Test
    @DisplayName("공통코드 등록 뷰 성공")
    void insertCmmnCodeView_Success() throws Exception {
        given(commonCodeService.selectCmmnClCodeList(any())).willReturn(Collections.emptyList());

        mockMvc.perform(get("/sym/ccm/cca/EgovCcmCmmnCodeRegist.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnCodeRegist"))
                .andExpect(model().attributeExists("cmmnClCode"))
                .andExpect(model().attributeExists("cmmnCode"));
    }

    @Test
    @DisplayName("공통코드 등록 성공")
    void insertCmmnCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/cca/EgovCcmCmmnCodeRegist.do")
                .param("codeId", "CD1")
                .param("codeIdNm", "New Code")
                .param("useAt", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/cca/EgovCcmCmmnCodeList.do"));
    }

    @Test
    @DisplayName("공통코드 수정 뷰 성공")
    void updateCmmnCodeView_Success() throws Exception {
        given(commonCodeService.selectCmmnCodeDetail(any())).willReturn(new CmmnCodeDto());

        mockMvc.perform(get("/sym/ccm/cca/EgovCcmCmmnCodeModify.do")
                .param("codeId", "CD1"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnCodeModify"))
                .andExpect(model().attributeExists("cmmnCode"));
    }

    @Test
    @DisplayName("공통코드 수정 성공")
    void updateCmmnCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/cca/EgovCcmCmmnCodeModify.do")
                .param("codeId", "CD1")
                .param("codeIdNm", "Updated Code")
                .param("useAt", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/cca/EgovCcmCmmnCodeList.do"));
    }

    @Test
    @DisplayName("공통코드 삭제 성공")
    void deleteCmmnCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/cca/EgovCcmCmmnCodeRemove.do")
                .param("codeId", "CD1"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/cca/EgovCcmCmmnCodeList.do"));
    }

    // =====================================================
    // 공통상세코드 (CmmnDetailCode)
    // =====================================================

    @Test
    @DisplayName("공통상세코드 목록 조회 성공")
    void selectCmmnDetailCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);
        given(commonCodeService.selectCmmnDetailCodeList(any())).willReturn(Collections.emptyList());
        given(commonCodeService.selectCmmnDetailCodeListTotCnt(any())).willReturn(0);

        mockMvc.perform(get("/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnDetailCodeList"))
                .andExpect(model().attributeExists("resultList"))
                .andExpect(model().attributeExists("paginationInfo"));
    }

    @Test
    @DisplayName("공통상세코드 상세 조회 성공")
    void selectCmmnDetailCodeDetail_Success() throws Exception {
        given(commonCodeService.selectCmmnDetailCodeDetail(any())).willReturn(new CmmnDetailCodeDto());

        mockMvc.perform(get("/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail.do")
                .param("codeId", "CD1")
                .param("code", "C01"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnDetailCodeDetail"))
                .andExpect(model().attributeExists("result"));
    }

    @Test
    @DisplayName("공통상세코드 등록 뷰 성공")
    void insertCmmnDetailCodeView_Success() throws Exception {
        given(commonCodeService.selectCmmnClCodeList(any())).willReturn(Collections.emptyList());
        given(commonCodeService.selectCmmnCodeList(any())).willReturn(Collections.emptyList());

        mockMvc.perform(get("/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist.do")
                .param("clCode", "CL1"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnDetailCodeRegist"))
                .andExpect(model().attributeExists("cmmnClCodeList"))
                .andExpect(model().attributeExists("cmmnCodeList"))
                .andExpect(model().attributeExists("cmmnDetailCode"))
                .andExpect(model().attributeExists("clCode"));
    }

    @Test
    @DisplayName("공통상세코드 등록 성공")
    void insertCmmnDetailCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist.do")
                .param("codeId", "CD1")
                .param("code", "C01")
                .param("codeNm", "New Detail Code")
                .param("useAt", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"));
    }

    @Test
    @DisplayName("공통상세코드 수정 뷰 성공")
    void updateCmmnDetailCodeView_Success() throws Exception {
        given(commonCodeService.selectCmmnDetailCodeDetail(any())).willReturn(new CmmnDetailCodeDto());

        mockMvc.perform(get("/sym/ccm/cde/EgovCcmCmmnDetailCodeModify.do")
                .param("codeId", "CD1")
                .param("code", "C01"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnDetailCodeModify"))
                .andExpect(model().attributeExists("cmmnDetailCode"));
    }

    @Test
    @DisplayName("공통상세코드 수정 성공")
    void updateCmmnDetailCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/cde/EgovCcmCmmnDetailCodeModify.do")
                .param("codeId", "CD1")
                .param("code", "C01")
                .param("codeNm", "Updated Detail Code")
                .param("useAt", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"));
    }

    @Test
    @DisplayName("공통상세코드 삭제 성공")
    void deleteCmmnDetailCode_Success() throws Exception {
        mockMvc.perform(post("/sym/ccm/cde/EgovCcmCmmnDetailCodeRemove.do")
                .param("codeId", "CD1")
                .param("code", "C01"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"));
    }

    // =====================================================
    // REST API
    // =====================================================

    @Test
    @DisplayName("REST API: 공통코드 조회 성공")
    void getCodes_Success() throws Exception {
        given(commonCodeService.getCodesByGroup(anyString())).willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/codes")
                .param("codeGroupId", "GRP1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("REST API: 공통코드 등록 성공")
    void createCode_Success() throws Exception {
        CommonCodeSaveRequest request = new CommonCodeSaveRequest("codeId", "codeGroupId", "codeName", "codeDesc", "Y");
        
        given(commonCodeService.createCode(any())).willReturn(new CommonCodeDto("codeId", "codeGroupId", "codeName", "codeDesc", "Y"));

        mockMvc.perform(post("/api/v1/codes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}