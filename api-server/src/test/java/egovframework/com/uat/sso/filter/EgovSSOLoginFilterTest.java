package egovframework.com.uat.sso.filter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.ApplicationContext;
import org.springframework.mock.web.MockFilterConfig;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.context.WebApplicationContext;

import egovframework.com.uat.uia.service.EgovLoginService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import java.io.IOException;

public class EgovSSOLoginFilterTest {

    private EgovSSOLoginFilter filter;
    private WebApplicationContext mockApplicationContext;
    private EgovLoginService mockLoginService;
    private MockServletContext servletContext;
    private MockFilterConfig filterConfig;

    @BeforeEach
    public void setUp() throws ServletException {
        filter = new EgovSSOLoginFilter();

        mockApplicationContext = mock(WebApplicationContext.class);
        mockLoginService = mock(EgovLoginService.class);

        // Mock LoginService retrieval
        when(mockApplicationContext.getBean("loginService")).thenReturn(mockLoginService);

        servletContext = new MockServletContext();
        servletContext.setAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE, mockApplicationContext);

        filterConfig = new MockFilterConfig(servletContext);
        filter.init(filterConfig);
    }

    @Test
    public void testDoFilter_NoSSOService_LocalAuth_True() throws IOException, ServletException {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("isLocallyAuthenticated", "true");
        request.setSession(session);

        // Mock SSOService to be missing
        when(mockApplicationContext.getBean("egovSSOService")).thenThrow(new NoSuchBeanDefinitionException("egovSSOService"));

        // When
        filter.doFilter(request, response, chain);

        // Then
        // Verify chain proceeded
        verify(chain).doFilter(request, response);

        // Verify isRemotelyAuthenticated is set to "fail" (This is the desired behavior)
        String isRemotelyAuthenticated = (String) session.getAttribute("isRemotelyAuthenticated");
        assertEquals("fail", isRemotelyAuthenticated, "Should be 'fail' when SSOService is missing");

        // Verify isLocallyAuthenticated remains "true"
        assertEquals("true", session.getAttribute("isLocallyAuthenticated"));
    }
}
