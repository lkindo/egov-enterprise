package egovframework.com.cmm.filter;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionTimeoutCookieFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private HttpSession session;

    @Test
    void doFilter_ShouldAddCookies() throws IOException, ServletException {
        // Arrange
        SessionTimeoutCookieFilter filter = new SessionTimeoutCookieFilter();
        when(request.getSession()).thenReturn(session);
        when(session.getMaxInactiveInterval()).thenReturn(1800); // 30 minutes
        when(request.isSecure()).thenReturn(false);

        // Act
        filter.doFilter(request, response, filterChain);

        // Assert
        verify(response, times(2)).addCookie(any(Cookie.class));
        verify(filterChain).doFilter(request, response);
    }
}
