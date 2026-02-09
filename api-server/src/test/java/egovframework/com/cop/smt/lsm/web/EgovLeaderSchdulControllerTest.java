package egovframework.com.cop.smt.lsm.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.ui.ModelMap;

import egovframework.com.cmm.ComDefaultCodeVO;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.cop.smt.lsm.service.EgovLeaderSchdulService;
import egovframework.com.cop.smt.lsm.service.LeaderSchdulVO;

class EgovLeaderSchdulControllerTest {

    private MockMvc mockMvc;

    @InjectMocks
    private EgovLeaderSchdulController egovLeaderSchdulController;

    @Mock
    private EgovLeaderSchdulService leaderSchdulService;

    @Mock
    private EgovCmmUseService cmmUseService;

    @Mock
    private EgovPropertyService propertyService;

    @Mock
    private EgovMessageSource egovMessageSource;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(egovLeaderSchdulController).build();

        // Mock Authentication
        EgovUserDetailsService mockUserDetailsService = mock(EgovUserDetailsService.class);
        LoginVO loginVO = new LoginVO();
        loginVO.setUniqId("USRCNFRM_00000000001");
        loginVO.setName("Test User");
        when(mockUserDetailsService.getAuthenticatedUser()).thenReturn(loginVO);
        when(mockUserDetailsService.isAuthenticated()).thenReturn(true);
        new EgovUserDetailsHelper().setEgovUserDetailsService(mockUserDetailsService);
    }

    @SuppressWarnings("unchecked")
    @Test
    public void testModifyLeaderSchdul_ShouldPopulateTimeLists() throws Exception {
        // Given
        LeaderSchdulVO leaderSchdulVO = new LeaderSchdulVO();
        leaderSchdulVO.setSchdulId("SCHDUL_0000000000001");
        leaderSchdulVO.setSchdulBgnDe("202310100900");
        leaderSchdulVO.setSchdulEndDe("202310101800");

        when(leaderSchdulService.selectLeaderSchdul(any(LeaderSchdulVO.class))).thenReturn(leaderSchdulVO);
        when(cmmUseService.selectCmmCodeDetail(any())).thenReturn(new ArrayList<>()); // Mock code lists

        // When
        MvcResult result = mockMvc.perform(post("/cop/smt/lsm/mng/modifyLeaderSchdul.do")
                .flashAttr("leaderSchdulVO", leaderSchdulVO))
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/cop/smt/lsm/EgovLeaderSchdulModify"))
                .andExpect(model().attributeExists("schdulBgndeHH"))
                .andExpect(model().attributeExists("schdulBgndeMM"))
                .andReturn();

        // Then
        ModelMap modelMap = result.getModelAndView().getModelMap();
        List<ComDefaultCodeVO> hh = (List<ComDefaultCodeVO>) modelMap.get("schdulBgndeHH");
        List<ComDefaultCodeVO> mm = (List<ComDefaultCodeVO>) modelMap.get("schdulBgndeMM");

        assertEquals(24, hh.size());
        assertEquals(60, mm.size());
        assertEquals("00", hh.get(0).getCode());
        assertEquals("23", hh.get(23).getCode());
        assertEquals("00", mm.get(0).getCode());
        assertEquals("59", mm.get(59).getCode());
    }
}
