package egovframework.com.cop.smt.sdm.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import java.util.ArrayList;
import java.util.List;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.company.project.service.schedule.EgovScheduleService;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.EgovFileMngUtil;
import egovframework.com.uss.umt.service.DeptManageVO;
import egovframework.com.uss.umt.service.EgovDeptManageService;

@WebMvcTest(EgovDeptSchdulManageController.class)
@AutoConfigureMockMvc(addFilters = false)
class EgovDeptSchdulManageControllerTest {

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class,
        SecurityAutoConfiguration.class
    })
    @Import(EgovDeptSchdulManageController.class)
    static class TestConfig {}

    @Autowired
    private MockMvc mockMvc;

    @MockBean(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @MockBean
    private EgovScheduleService egovScheduleService;

    @MockBean(name = "egovDeptManageService")
    private EgovDeptManageService egovDeptManageService;

    @MockBean(name = "EgovCmmUseService")
    private EgovCmmUseService cmmUseService;

    @MockBean(name = "propertiesService")
    private EgovPropertyService propertiesService;

    @MockBean(name = "EgovFileMngService")
    private EgovFileMngService fileMngService;

    @MockBean(name = "EgovFileMngUtil")
    private EgovFileMngUtil fileUtil;

    @Test
    void egovMeetingManageLisAuthorGroupPopupPost_ReturnsPopupViewWithList() throws Exception {
        // Given
        given(propertiesService.getInt("pageUnit")).willReturn(10);
        given(propertiesService.getInt("pageSize")).willReturn(10);

        List<DeptManageVO> mockList = new ArrayList<>();
        DeptManageVO vo = new DeptManageVO();
        vo.setOrgnztId("ORGNZT_0000000000001");
        vo.setOrgnztNm("Test Dept");
        mockList.add(vo);

        given(egovDeptManageService.selectDeptManageListPaged(any(DeptManageVO.class))).willReturn(mockList);
        given(egovDeptManageService.selectDeptManageListTotCnt(any(DeptManageVO.class))).willReturn(1);

        // When & Then
        mockMvc.perform(post("/cop/smt/sdm/EgovDeptSchdulManageAuthorGroupPopup.do")
                .param("searchCondition", "ORGNZT_NM")
                .param("searchKeyword", "Test"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(view().name("egovframework/com/cop/smt/sdm/EgovDeptSchdulManageAuthorGroupPopup"))
                .andExpect(model().attribute("resultList", mockList))
                .andExpect(model().attributeExists("paginationInfo"));

        verify(egovDeptManageService).selectDeptManageListPaged(any(DeptManageVO.class));
    }
}
