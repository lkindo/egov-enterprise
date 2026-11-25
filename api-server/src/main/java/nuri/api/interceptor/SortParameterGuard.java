package nuri.api.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import nuri.api.support.SortableBy;
import nuri.api.support.UnsortedPageable;
import nuri.foundation.core.exception.InvalidSortParameterException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.SortHandlerMethodArgumentResolver;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 정렬 값이 속성 경로와 방향 형식인지, 그리고 그 핸들러가 받는 정렬인지 저장소에 닿기 전에 본다.
 *
 * <p>[2026-09-24 ZAP API 스캔] 형식이 아닌 정렬 값은 저장소마다 다른 예외로 500 이 됐다 — {@code [crtDt,DESC]} 는
 * Spring Data 의 정렬 식 검사가, 대문자가 이어진 수천 자 값은 속성 경로 깊이 가드("depth greater than 1000")가
 * 거부했다. 예외마다 좇는 대신 경계에서 형식을 한 번 본다.
 *
 * <p>[2026-11-25 품질 평가, DEC-OPS-433] 형식만 보면 화면이 쓰지 않는 임의 속성(인덱스 없는 열, 연관 경로)으로도 정렬할 수 있었다.
 * 이제 {@code Pageable}·{@code Sort} 를 받는 핸들러는 기본으로 클라이언트 정렬을 받지 않는다 — 속성은 {@link SortableBy} 의 허용
 * 목록에 있어야 하고, 표시가 없으면 형식이 맞아도 400 이다. 속성은 손으로 쪼개지 않고 핸들러가 실제로 받을 정렬을 Spring Data 의
 * 정렬 리졸버로 만들어 본다(공백·옵션 위치까지 리졸버와 같게, Codex 검토). 대소문자 무시({@code ignorecase})는 허용 목록이 열어 둘 때만
 * 받는다 — 숫자 열에 붙으면 저장소가 문자열 함수로 감싸 실패한다. {@link UnsortedPageable} 은 종전대로 받되 걷어 낸다(ADR-0036).
 * 정렬 인자가 없는 핸들러는 형식만 본다. 정렬 파라미터 이름은 리졸버 설정({@code spring.data.web.sort.sort-parameter})과 같고,
 * {@code @Qualifier} 가 붙은 인자는 리졸버처럼 {@code 한정자_이름} 을 읽는다 — 인자마다 그 인자가 실제로 받는 키만 보고, 모든 정렬 인자에
 * 정책을 적용한다(Codex 2차 검토).
 */
public class SortParameterGuard implements HandlerInterceptor {

    /** 속성 경로(점으로 이은 식별자 최대 5단)와 방향·대소문자 옵션 토큰. 한 조각은 64자까지다. */
    private static final Pattern TOKEN =
            Pattern.compile("[A-Za-z_][A-Za-z0-9_]{0,63}(?:\\.[A-Za-z_][A-Za-z0-9_]{0,63}){0,4}");

    private final SortHandlerMethodArgumentResolver sortResolver;
    private final String sortParameter;

    /** 기본 설정의 리졸버와 {@code sort} 이름 — 단위 시험용. */
    public SortParameterGuard() {
        this(new SortHandlerMethodArgumentResolver(), "sort");
    }

    public SortParameterGuard(SortHandlerMethodArgumentResolver sortResolver, String sortParameter) {
        this.sortResolver = Objects.requireNonNull(sortResolver, "sortResolver");
        this.sortParameter = Objects.requireNonNull(sortParameter, "sortParameter");
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        assertFormat(request.getParameterValues(sortParameter));
        if (!(handler instanceof HandlerMethod method)) {
            return true;
        }
        for (MethodParameter parameter : method.getMethodParameters()) {
            Class<?> type = parameter.getParameterType();
            if (!Pageable.class.isAssignableFrom(type) && !Sort.class.isAssignableFrom(type)) {
                continue;
            }
            String key = parameterKey(parameter);
            String[] values = request.getParameterValues(key);
            if (values == null) {
                continue; // 이 인자는 정렬을 받지 않았다 — 리졸버의 기본 정렬(@SortDefault·@PageableDefault)은 명시 정렬이 아니다.
            }
            assertFormat(values);
            if (parameter.hasParameterAnnotation(UnsortedPageable.class)) {
                continue; // 받되 핸들러가 걷어 낸다(PageRequests.unsorted).
            }
            Sort requested = sortResolver.resolveArgument(parameter, null, new ServletWebRequest(request), null);
            if (requested.isUnsorted()) {
                continue; // 방향만 온 값 — 정렬할 속성이 없다.
            }
            SortableBy sortable = parameter.getParameterAnnotation(SortableBy.class);
            if (sortable == null) {
                throw new InvalidSortParameterException();
            }
            Set<String> allowed = Set.of(sortable.value());
            for (Sort.Order order : requested) {
                if (!allowed.contains(order.getProperty()) || order.isIgnoreCase() && !sortable.ignoreCase()) {
                    throw new InvalidSortParameterException();
                }
            }
        }
        return true;
    }

    /** 리졸버가 이 인자에서 읽는 정렬 키 — {@code @Qualifier("left")} 면 {@code left_sort}(Spring Data 기본 구분자). */
    private String parameterKey(MethodParameter parameter) {
        Qualifier qualifier = parameter.getParameterAnnotation(Qualifier.class);
        return qualifier == null || qualifier.value().isEmpty() ? sortParameter : qualifier.value() + "_" + sortParameter;
    }

    private static void assertFormat(String[] values) {
        if (values == null) {
            return;
        }
        for (String value : values) {
            for (String token : value.split(",")) {
                String trimmed = token.trim();
                if (!trimmed.isEmpty() && !TOKEN.matcher(trimmed).matches()) {
                    throw new InvalidSortParameterException();
                }
            }
        }
    }
}
