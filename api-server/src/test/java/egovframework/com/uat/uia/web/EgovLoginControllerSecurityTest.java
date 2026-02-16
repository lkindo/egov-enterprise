package egovframework.com.uat.uia.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;

import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.config.EgovLoginConfig;
import egovframework.com.cmm.service.EgovCmmUseService;
import egovframework.com.cmm.service.EgovUserDetailsService;
import egovframework.com.uat.uia.service.EgovLoginService;

@WebMvcTest(controllers = EgovLoginController.class)
public class EgovLoginControllerSecurityTest {

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

    @MockBean
    private org.springframework.security.authentication.AuthenticationManager authenticationManager;

    @MockBean
    private org.springframework.security.web.context.SecurityContextRepository securityContextRepository;

    @Test
    @WithMockUser
    public void testActionLoginRefusesGet() throws Exception {
        // GET should be rejected (405 Method Not Allowed)
        mockMvc.perform(get("/uat/uia/actionLogin.do")
                .param("id", "user")
                .param("password", "pass"))
                .andDo(print())
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @WithMockUser
    public void testActionSecurityProcessRefusesGet() throws Exception {
        // GET should be rejected (405 Method Not Allowed)
        mockMvc.perform(get("/uat/uia/actionSecurityProcess.do")
                .param("userSe", "USR")
                .param("id", "user")
                .param("uniqId", "pass"))
                .andDo(print())
                .andExpect(status().isMethodNotAllowed());
    }
}
