package nuri.api.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import nuri.business.security.util.SecurityUtil;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 관리자가 초기화한 임시 비밀번호로 로그인한 사용자는 비밀번호를 바꾸기 전까지 다른 API 를 쓸 수 없다
 * (2026-10-01 결정 18).
 *
 * <p>종전에는 관리자가 정해 알려 준 비밀번호를 그대로 계속 쓸 수 있어, 관리자도 아는 비밀번호가 계정에 남았다.
 * 화면만 막으면 API 를 직접 부르는 경로가 남으므로 서버가 거부한다. 허용하는 것은 인증 경로(로그인·로그아웃·
 * 재발급·현재 사용자·추가 인증)와 본인 정보 조회, 본인 비밀번호 변경뿐이다. 변경하면 표시가 풀리고, 변경은
 * 이전 access token 을 끊으므로(DEC-OPS-094) 화면은 다시 로그인한다.
 */
public class PasswordChangeRequiredGuard implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!SecurityUtil.isPasswordChangeRequired() || allowed(request.getMethod(), pathWithinApplication(request))) {
            return true;
        }
        throw new BusinessException(CommonErrorCode.PASSWORD_CHANGE_REQUIRED);
    }

    static boolean allowed(String method, String path) {
        if (path.startsWith("/api/v1/auth/")) {
            return true;
        }
        return ("GET".equals(method) && "/api/v1/users/me".equals(path))
                || ("PUT".equals(method) && "/api/v1/users/me/password".equals(path));
    }

    private static String pathWithinApplication(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        return context != null && !context.isEmpty() && uri.startsWith(context) ? uri.substring(context.length()) : uri;
    }
}
