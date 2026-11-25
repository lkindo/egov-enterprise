package nuri.api.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import nuri.api.support.SortableBy;
import nuri.api.support.UnsortedPageable;
import nuri.foundation.core.exception.InvalidSortParameterException;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * {@code sort} 값이 속성 경로와 방향 형식인지, 그리고 그 핸들러가 받는 정렬인지 저장소에 닿기 전에 본다.
 *
 * <p>[2026-09-24 ZAP API 스캔] 형식이 아닌 정렬 값은 저장소마다 다른 예외로 500 이 됐다 — {@code [crtDt,DESC]} 는
 * Spring Data 의 정렬 식 검사가, 대문자가 이어진 수천 자 값은 속성 경로 깊이 가드("depth greater than 1000")가
 * 거부했다. 예외마다 좇는 대신 경계에서 형식을 한 번 본다.
 *
 * <p>[2026-11-25 품질 평가] 형식만 보면 화면이 쓰지 않는 임의 속성(인덱스 없는 열, 연관 경로)으로도 정렬할 수 있었다. 이제
 * {@code Pageable}·{@code Sort} 를 받는 핸들러는 기본으로 클라이언트 정렬을 받지 않는다 — 속성은 {@link SortableBy} 의 허용 목록에
 * 있어야 하고, 표시가 없으면 형식이 맞아도 400 이다. {@link UnsortedPageable} 은 종전대로 받되 걷어 낸다(ADR-0036). 정렬 인자가 없는
 * 핸들러는 {@code sort} 를 쓰지 않으므로 형식만 본다.
 */
public class SortParameterGuard implements HandlerInterceptor {

    /** 속성 경로(점으로 이은 식별자 최대 5단)와 방향·대소문자 옵션 토큰. 한 조각은 64자까지다. */
    private static final Pattern TOKEN =
            Pattern.compile("[A-Za-z_][A-Za-z0-9_]{0,63}(?:\\.[A-Za-z_][A-Za-z0-9_]{0,63}){0,4}");

    /** Spring Data 의 {@code sort} 식에서 속성이 아닌 조각(방향·대소문자 무시 옵션). */
    private static final Set<String> MODIFIERS = Set.of("asc", "desc", "ignorecase");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String[] values = request.getParameterValues("sort");
        if (values == null) {
            return true;
        }
        List<String> properties = new ArrayList<>();
        for (String value : values) {
            for (String token : value.split(",")) {
                String trimmed = token.trim();
                if (trimmed.isEmpty()) {
                    continue;
                }
                if (!TOKEN.matcher(trimmed).matches()) {
                    throw new InvalidSortParameterException();
                }
                if (!MODIFIERS.contains(trimmed.toLowerCase(Locale.ROOT))) {
                    properties.add(trimmed);
                }
            }
        }
        if (properties.isEmpty() || !(handler instanceof HandlerMethod method)) {
            return true;
        }
        for (MethodParameter parameter : method.getMethodParameters()) {
            Class<?> type = parameter.getParameterType();
            if (!Pageable.class.isAssignableFrom(type) && !Sort.class.isAssignableFrom(type)) {
                continue;
            }
            if (parameter.hasParameterAnnotation(UnsortedPageable.class)) {
                return true; // 받되 핸들러가 걷어 낸다(PageRequests.unsorted).
            }
            SortableBy sortable = parameter.getParameterAnnotation(SortableBy.class);
            if (sortable == null || !Set.of(sortable.value()).containsAll(properties)) {
                throw new InvalidSortParameterException();
            }
            return true;
        }
        return true;
    }
}
