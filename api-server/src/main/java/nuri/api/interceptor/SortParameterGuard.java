package nuri.api.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import nuri.foundation.core.exception.InvalidSortParameterException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.regex.Pattern;

/**
 * {@code sort} 값이 속성 경로와 방향 형식인지 저장소에 닿기 전에 본다.
 *
 * <p>[2026-09-24 ZAP API 스캔] 형식이 아닌 정렬 값은 저장소마다 다른 예외로 500 이 됐다 — {@code [crtDt,DESC]} 는
 * Spring Data 의 정렬 식 검사가, 대문자가 이어진 수천 자 값은 속성 경로 깊이 가드("depth greater than 1000")가
 * 거부했다. 예외마다 좇는 대신 경계에서 형식을 한 번 본다. 형식은 맞지만 없는 필드는 전역 예외 처리기가 400 으로 바꾼다.
 * 컨트롤러 가운데 {@code sort} 를 자체 의미로 받는 곳은 없다(모두 Pageable·Sort).
 */
public class SortParameterGuard implements HandlerInterceptor {

    /** 속성 경로(점으로 이은 식별자 최대 5단)와 방향·대소문자 옵션 토큰. 한 조각은 64자까지다. */
    private static final Pattern TOKEN =
            Pattern.compile("[A-Za-z_][A-Za-z0-9_]{0,63}(?:\\.[A-Za-z_][A-Za-z0-9_]{0,63}){0,4}");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String[] values = request.getParameterValues("sort");
        if (values == null) {
            return true;
        }
        for (String value : values) {
            for (String token : value.split(",")) {
                String trimmed = token.trim();
                if (!trimmed.isEmpty() && !TOKEN.matcher(trimmed).matches()) {
                    throw new InvalidSortParameterException();
                }
            }
        }
        return true;
    }
}
