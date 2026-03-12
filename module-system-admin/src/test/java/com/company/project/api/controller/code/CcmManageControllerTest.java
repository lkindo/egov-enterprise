package com.company.project.api.controller.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.security.service.CustomUserDetails;
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

import java.util.ArrayList;

import static org.mockito.ArgumentMatchers.any;
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

    @Test
    @DisplayName("공통분류코드 목록 조회 성공")
    void selectCmmnClCodeList_Success() throws Exception {
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);

        mockMvc.perform(get("/sym/ccm/ccc/EgovCcmCmmnClCodeList.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("cmm/sym/ccm/EgovCcmCmmnClCodeList"))
                .andExpect(model().attributeExists("resultList"));
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
}
