package egovframework.com.uss.umt.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import java.util.Collections;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.uss.umt.service.EgovEntrprsManageService;

class EgovEntrprsManageControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EgovEntrprsManageService entrprsManageService;

    @Mock
    private EgovCmmUseService cmmUseService;

    @Mock
    private EgovPropertyService propertiesService;

    @InjectMocks
    private EgovEntrprsManageController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        // Mock EgovUserDetailsHelper
        EgovUserDetailsService mockUserDetailsService = mock(EgovUserDetailsService.class);
        when(mockUserDetailsService.isAuthenticated()).thenReturn(true);

        // Save original and set mock
        // Since getAuthenticatedUser is static, we assume it uses the helper's static
        // field.
        // We can't easily get the original via getter if it's private/protected, but we
        // can just set it.
        // Wait, EgovUserDetailsHelper doesn't expose getter for the service itself
        // easily.
        // But we can just overwrite it.
        new EgovUserDetailsHelper().setEgovUserDetailsService(mockUserDetailsService);
    }

    @AfterEach
    void tearDown() {
        // We should try to reset it, but since we don't know the original, we just
        // leave it?
        // Or set it to null so it re-initializes next time?
        new EgovUserDetailsHelper().setEgovUserDetailsService(null);
    }

    @Test
    void testInsertEntrprsMberView_ExceptionHandling() throws Exception {
        // Arrange
        // Mock cmmUseService to throw exception when fetching password hints (COM022)
        when(cmmUseService.selectCmmCodeDetail(any(ComDefaultCodeVO.class)))
                .thenAnswer(invocation -> {
                    ComDefaultCodeVO vo = invocation.getArgument(0);
                    if ("COM022".equals(vo.getCodeId())) {
                        throw new RuntimeException("Simulated Database Error");
                    }
                    return Collections.emptyList();
                });

        // Act & Assert
        mockMvc.perform(get("/uss/umt/EgovEntrprsMberInsertView.do"))
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/uss/umt/EgovEntrprsMberInsert"))
                .andExpect(model().attribute("passwordHint_result", Collections.emptyList()));
    }
}
