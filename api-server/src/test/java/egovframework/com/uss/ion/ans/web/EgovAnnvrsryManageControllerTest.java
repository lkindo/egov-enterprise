package egovframework.com.uss.ion.ans.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import com.company.project.service.anniversary.EgovAnniversaryService;
import com.company.project.service.anniversary.dto.AnniversaryDto;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import org.egovframe.rte.fdl.excel.EgovExcelService;

@WebMvcTest(EgovAnnvrsryManageController.class)
@AutoConfigureMockMvc(addFilters = false)
public class EgovAnnvrsryManageControllerTest {

    @SpringBootApplication
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean(name = "anniversaryService")
    private EgovAnniversaryService egovAnniversaryService;

    @MockBean(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @MockBean(name = "EgovCmmUseService")
    private EgovCmmUseService cmmUseService;

    @MockBean(name = "excelZipService")
    private EgovExcelService excelZipService;

    @BeforeEach
    public void setup() {
        EgovUserDetailsService mockUserDetailsService = mock(EgovUserDetailsService.class);
        LoginVO loginVO = new LoginVO();
        loginVO.setUniqId("USRCNFRM_00000000001");
        loginVO.setName("Test User");

        when(mockUserDetailsService.getAuthenticatedUser()).thenReturn(loginVO);
        when(mockUserDetailsService.isAuthenticated()).thenReturn(true);

        new EgovUserDetailsHelper().setEgovUserDetailsService(mockUserDetailsService);

        when(egovMessageSource.getMessage(anyString())).thenReturn("Message");
    }

    @Test
    public void testUpdateAnnvrsryManage_DuplicateCheck_Success() throws Exception {
        when(egovAnniversaryService.checkAnniversaryDuplicate(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(0);

        mockMvc.perform(post("/uss/ion/ans/updateAnnvrsryManage.do")
                .param("annId", "ANN_001")
                .param("usid", "USRCNFRM_00000000001")
                .param("annvrsryDe", "20231010")
                .param("annvrsryNm", "My Anniversary")
                .param("cldrSe", "1")
                .param("reptitSe", "1")
                .param("annvrsrySetup", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("forward:/uss/ion/ans/selectAnnvrsryManageList.do"));

        verify(egovAnniversaryService).updateAnniversary(eq("ANN_001"), anyString(), any(AnniversaryDto.class));
    }

    @Test
    public void testUpdateAnnvrsryManage_DuplicateCheck_Fail() throws Exception {
        when(egovAnniversaryService.checkAnniversaryDuplicate(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(1);

        mockMvc.perform(post("/uss/ion/ans/updateAnnvrsryManage.do")
                .param("annId", "ANN_001")
                .param("usid", "USRCNFRM_00000000001")
                .param("annvrsryDe", "20231010")
                .param("annvrsryNm", "Duplicate Anniversary")
                .param("cldrSe", "1")
                .param("reptitSe", "1")
                .param("annvrsrySetup", "Y"))
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/uss/ion/ans/EgovAnnvrsryManageUpdt"))
                .andExpect(model().attributeExists("dplctMessage"));
    }
}
