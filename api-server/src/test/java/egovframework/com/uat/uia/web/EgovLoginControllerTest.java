package egovframework.com.uat.uia.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.TestConfiguration;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.SpringBootConfiguration;

import egovframework.com.cmm.EgovComponentChecker;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.config.EgovLoginConfig;
import egovframework.com.uat.uia.service.EgovLoginService;

@WebMvcTest(controllers = EgovLoginController.class)
public class EgovLoginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean(name = "loginService")
    private EgovLoginService loginService;

    @MockBean(name = "EgovCmmUseService")
    private EgovCmmUseService cmmUseService;

    @MockBean(name = "egovUserDetailsService")
    private EgovUserDetailsService egovUserDetailsService;

    @MockBean(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @MockBean(name = "egovLoginConfig")
    private EgovLoginConfig egovLoginConfig;

    @MockBean(name = "leaveaTrace")
    private LeaveaTrace leaveaTrace;

    @TestConfiguration
    @SpringBootConfiguration
    @EnableAutoConfiguration
    @ComponentScan(basePackageClasses = { EgovLoginController.class,
            EgovComponentChecker.class }, useDefaultFilters = false, includeFilters = {
                    @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = EgovLoginController.class),
                    @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = EgovComponentChecker.class)
            })
    static class Config {
    }

    @Test
    @WithMockUser
    public void testLoginMessageXssVulnerability() throws Exception {
        String maliciousMessage = "\"><script>alert('xss')</script>";
        // EgovWebUtil.clearXSSMinimum replaces:
        // " -> &#34;"
        // > -> &gt;
        // < -> &lt;
        // ' -> &#39;
        String sanitizedMessage = "&#34;&gt;&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;";

        mockMvc.perform(get("/uat/uia/egovLoginUsr.do")
                .param("loginMessage", maliciousMessage))
                .andExpect(status().isOk())
                .andExpect(view().name("uat/uia/EgovLoginUsr"))
                .andExpect(model().attribute("loginMessage", sanitizedMessage)); // Expecting the sanitized message
    }
}
