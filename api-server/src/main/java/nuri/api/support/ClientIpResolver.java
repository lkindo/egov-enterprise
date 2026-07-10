package nuri.api.support;

import jakarta.servlet.http.HttpServletRequest;

/**
 * HTTP 요청의 클라이언트 IP를 추출하는 공용 유틸리티.
 *
 * <p>프록시/로드밸런서를 경유하는 경우를 고려하여 표준 헤더 우선순위
 * (X-Forwarded-For → Proxy-Client-IP → WL-Proxy-Client-IP → RemoteAddr)를 따른다.
 * 헤더 값이 없거나 비어 있거나 "unknown"이면 다음 후보로 넘어간다.
 *
 * <p>기존에 {@code AuthApiController.getClientIp}와
 * {@code OperationalAuditInterceptor.getRemoteAddr}에 동일 로직이 중복되어 있던 것을 통합한다.
 */
public final class ClientIpResolver {

    /** 프록시 경유 클라이언트 IP를 담는 헤더 우선순위. */
    private static final String[] IP_HEADERS = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP"
    };

    private ClientIpResolver() {
        // 유틸리티 클래스 — 인스턴스화 금지
    }

    /**
     * 요청의 클라이언트 IP를 추출한다. 유효한 프록시 헤더가 없으면 {@link HttpServletRequest#getRemoteAddr()}를 반환한다.
     */
    public static String resolve(HttpServletRequest request) {
        for (String header : IP_HEADERS) {
            String ip = request.getHeader(header);
            if (isValid(ip)) {
                return ip;
            }
        }
        return request.getRemoteAddr();
    }

    private static boolean isValid(String ip) {
        return ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip);
    }
}
