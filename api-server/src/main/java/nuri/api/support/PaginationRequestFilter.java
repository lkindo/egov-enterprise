package nuri.api.support;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.FieldErrorItem;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 목록 페이지 입력의 경계 — ADR-0036 의 페이징 규약을 HTTP 한 곳에서 집행한다.
 *
 * <p>[왜 필터인가] Spring 은 모르는 query 이름을 오류 없이 무시하고, {@code Pageable} 리졸버는 범위 밖 값을
 * 조용히 깎는다(1 기반 설정에서 {@code page=0} 은 첫 페이지, {@code size=101} 은 100). 그래서 이름이나 기준을 틀린
 * 호출은 red 없이 <b>다른 페이지</b>를 돌려받았다 — 그룹 화면의 건수 선택, E2E 정리의 첫 10건, 부하 시험의 첫 페이지
 * 누락이 같은 부류였다. 이 필터가 그 조용한 경우를 400 으로 바꾼다. 같은 자리의 선례는
 * {@code CredentialRequestTargetFilter}(헌법 제11조 3항)다.
 *
 * <p>[규칙] {@code /api/} 아래 GET·HEAD 요청에서
 * <ol>
 *   <li>{@code page} 는 1 이상 정수 하나, {@code size} 는 1~{@value #MAX_SIZE} 정수 하나다. 아니면 400.</li>
 *   <li>옛 이름 {@code pageIndex}·{@code pageUnit} 은 뜻이 같으므로 한 릴리스 동안 {@code page}·{@code size} 로 옮겨 받고
 *       경고 로그를 남긴다. 새 이름과 함께 오면 어느 쪽이 맞는지 알 수 없으므로 400.</li>
 *   <li>서버가 읽은 적 없는 옛 이름({@link #RETIRED})은 400 — 조용히 무시되던 이름이다.</li>
 * </ol>
 *
 * <p>값은 로그에 남기지 않는다(이름·경로만). 인증보다 뒤(Spring Security 필터 체인 다음)에 돌아 인증 실패가 먼저다.
 * 남는 조용한 경우는 "옛 0 기반으로 {@code page≥1} 을 부르는 호출" 하나다 — 같은 이름의 뜻이 바뀌어 막을 수 없다.
 */
@Slf4j
@Component
public class PaginationRequestFilter extends OncePerRequestFilter {

    /** 1 기반 페이지 번호의 HTTP 이름. */
    public static final String PAGE = "page";
    /** 페이지당 건수의 HTTP 이름. */
    public static final String SIZE = "size";
    /** 한 번에 받는 건수 상한 — BaseSearchDto.MAX_PAGE_UNIT·spring.data.web.pageable.max-page-size 와 같다. */
    public static final int MAX_SIZE = 100;

    /** 한 릴리스 동안 받는 옛 이름 → 새 이름. */
    static final Map<String, String> ALIASES = Map.of("pageIndex", PAGE, "pageUnit", SIZE);

    /** 서버가 읽은 적 없는 옛 이름 — 받으면 400. */
    static final List<String> RETIRED = List.of("pageNo", "pageSize", "recordCountPerPage", "firstIndex", "lastIndex");

    /** 앞자리 0·부호·공백 없는 1 이상 정수(9자리까지 — int 범위 안). */
    private static final Pattern POSITIVE_INT = Pattern.compile("[1-9][0-9]{0,8}");

    private final ObjectMapper objectMapper;

    public PaginationRequestFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        if (!"GET".equals(method) && !"HEAD".equals(method)) {
            return true;
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !path.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Map<String, String[]> original = request.getParameterMap();

        for (String retired : RETIRED) {
            if (original.containsKey(retired)) {
                reject(response, retired, retired + " 는 받지 않습니다. 페이지는 page(1부터), 건수는 size(1~" + MAX_SIZE + ")로 보내십시오.");
                return;
            }
        }

        Map<String, String[]> rewritten = null;
        for (Map.Entry<String, String> alias : ALIASES.entrySet()) {
            if (!original.containsKey(alias.getKey())) {
                continue;
            }
            if (original.containsKey(alias.getValue())) {
                reject(response, alias.getKey(), alias.getKey() + " 와 " + alias.getValue() + " 를 함께 보낼 수 없습니다. "
                        + alias.getValue() + " 하나만 보내십시오.");
                return;
            }
            if (rewritten == null) {
                rewritten = new LinkedHashMap<>(original);
            }
            rewritten.put(alias.getValue(), rewritten.remove(alias.getKey()));
            log.warn("[PAGINATION] 폐기 예정 이름 {} 를 {} 로 받았습니다 — {} {}",
                    alias.getKey(), alias.getValue(), request.getMethod(), request.getRequestURI());
        }

        Map<String, String[]> effective = rewritten == null ? original : rewritten;
        if (!valid(effective.get(PAGE), Integer.MAX_VALUE)) {
            reject(response, PAGE, "page 는 1 이상의 정수 하나여야 합니다(1부터 시작).");
            return;
        }
        if (!valid(effective.get(SIZE), MAX_SIZE)) {
            reject(response, SIZE, "size 는 1 이상 " + MAX_SIZE + " 이하의 정수 하나여야 합니다.");
            return;
        }

        chain.doFilter(rewritten == null ? request : new RewrittenParameters(request, rewritten), response);
    }

    /** 값이 없거나(파라미터 없음) 상한 안의 1 이상 정수 하나면 통과. */
    private static boolean valid(String[] values, int max) {
        if (values == null) {
            return true;
        }
        if (values.length != 1 || !POSITIVE_INT.matcher(values[0]).matches()) {
            return false;
        }
        return Integer.parseInt(values[0]) <= max;
    }

    private void reject(HttpServletResponse response, String field, String message) throws IOException {
        ApiResponse<Void> body = ApiResponse.error(CommonErrorCode.INVALID_INPUT_VALUE, message,
                List.of(new FieldErrorItem(field, message)));
        response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /** 옛 이름을 새 이름으로 옮긴 파라미터를 리졸버·바인더에 보인다. 원래 query 문자열은 그대로다. */
    private static final class RewrittenParameters extends HttpServletRequestWrapper {
        private final Map<String, String[]> parameters;

        RewrittenParameters(HttpServletRequest request, Map<String, String[]> parameters) {
            super(request);
            this.parameters = Collections.unmodifiableMap(parameters);
        }

        @Override
        public String getParameter(String name) {
            String[] values = parameters.get(name);
            return values == null || values.length == 0 ? null : values[0];
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return parameters;
        }

        @Override
        public Enumeration<String> getParameterNames() {
            return Collections.enumeration(parameters.keySet());
        }

        @Override
        public String[] getParameterValues(String name) {
            return parameters.get(name);
        }
    }
}
