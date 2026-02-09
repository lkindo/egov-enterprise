package egovframework.com.cmm.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import egovframework.com.cmm.LoginVO;

class EgovUserDetailsSessionServiceImplTest {

    private EgovUserDetailsSessionServiceImpl egovUserDetailsSessionService;

    @BeforeEach
    void setUp() {
        egovUserDetailsSessionService = new EgovUserDetailsSessionServiceImpl();
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void getAuthenticatedUser_ShouldReturnNull_WhenRequestAttributesIsNull() {
        // Given
        RequestContextHolder.resetRequestAttributes();

        // When
        Object result = egovUserDetailsSessionService.getAuthenticatedUser();

        // Then
        assertNull(result);
    }

    @Test
    void getAuthenticatedUser_ShouldReturnLoginVO_WhenLoginVOIsInSession() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        LoginVO loginVO = new LoginVO();
        loginVO.setId("TEST_USER");
        request.getSession().setAttribute("LoginVO", loginVO);

        // When
        Object result = egovUserDetailsSessionService.getAuthenticatedUser();

        // Then
        assertNotNull(result);
        assertTrue(result instanceof LoginVO);
        assertEquals("TEST_USER", ((LoginVO) result).getId());
    }

    @Test
    void isAuthenticated_ShouldReturnFalse_WhenRequestAttributesIsNull() {
        // Given
        RequestContextHolder.resetRequestAttributes();

        // When
        Boolean result = egovUserDetailsSessionService.isAuthenticated();

        // Then
        assertFalse(result);
    }

    @Test
    void isAuthenticated_ShouldReturnTrue_WhenLoginVOIsInSession() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        LoginVO loginVO = new LoginVO();
        request.getSession().setAttribute("LoginVO", loginVO);

        // When
        Boolean result = egovUserDetailsSessionService.isAuthenticated();

        // Then
        assertTrue(result);
    }

    @Test
    void isAuthenticated_ShouldReturnTrue_WhenLowercaseLoginVOIsInSession() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        LoginVO loginVO = new LoginVO();
        request.getSession().setAttribute("loginVO", loginVO);

        // When
        Boolean result = egovUserDetailsSessionService.isAuthenticated();

        // Then
        assertTrue(result);
    }

    @Test
    void isAuthenticated_ShouldReturnFalse_WhenLoginVOIsNotInSession() {
        // Given
        MockHttpServletRequest request = new MockHttpServletRequest();
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        // When
        Boolean result = egovUserDetailsSessionService.isAuthenticated();

        // Then
        assertFalse(result);
    }
}
