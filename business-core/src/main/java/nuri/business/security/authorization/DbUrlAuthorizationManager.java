package nuri.business.security.authorization;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.util.AntPathMatcher;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * DB 기반 URL 인가 매니저.
 *
 * <p>{@code tb_prgrm_lst}(URL 패턴) + {@code tb_role_prgrm_map}(롤↔프로그램 매핑)에서
 * URL → 요구 롤 매핑을 로드하여, 요청 URL에 대해 인가 결정을 내린다.
 *
 * <p><b>fail-closed 원칙</b>: 매핑 부재·DB 조회 실패 시 접근 거부(deny)가 기본이다.
 *
 * <p>Caffeine 캐시로 매 요청 DB 조회를 방지하며, {@link #evictCache()}로 변경 시 무효화한다.
 */
@Slf4j
public class DbUrlAuthorizationManager implements AuthorizationManager<RequestAuthorizationContext> {

    private static final String LOAD_SQL = """
            SELECT p.url, rpm.role_id
            FROM tb_prgrm_lst p
            JOIN tb_role_prgrm_map rpm ON p.prgrm_file_nm = rpm.prgrm_file_nm
            WHERE p.url IS NOT NULL
            """;

    private static final String CACHE_KEY = "url_role_mappings";

    private final JdbcTemplate jdbcTemplate;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final List<String> securePaths;

    /** URL 패턴 → 허용 롤(ROLE_ 접두사 포함) 집합 */
    private final Cache<String, Map<String, Set<String>>> cache;

    public DbUrlAuthorizationManager(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, Collections.emptyList());
    }

    public DbUrlAuthorizationManager(JdbcTemplate jdbcTemplate, List<String> securePaths) {
        this.jdbcTemplate = jdbcTemplate;
        this.securePaths = securePaths != null ? securePaths : Collections.emptyList();
        this.cache = Caffeine.newBuilder()
                .maximumSize(1)
                .expireAfterWrite(5, TimeUnit.MINUTES)
                .build();
    }

    @Override
    @SuppressWarnings("deprecation")
    public AuthorizationDecision check(Supplier<Authentication> authentication, RequestAuthorizationContext context) {
        String requestUri = context.getRequest().getRequestURI();
        Authentication auth = authentication.get();

        if (auth == null || !auth.isAuthenticated()) {
            return new AuthorizationDecision(false);
        }

        Map<String, Set<String>> mappings = loadMappings();
        if (mappings.isEmpty()) {
            // DB에 매핑이 없으면 fail-closed: 거부
            log.warn("[DbUrlAuth] URL 인가 매핑이 비어 있음 (fail-closed) → 거부: {}", requestUri);
            return new AuthorizationDecision(false);
        }

        // 요청 URI에 매칭되는 URL 패턴 찾기
        Set<String> requiredRoles = new LinkedHashSet<>();
        boolean matched = false;

        for (Map.Entry<String, Set<String>> entry : mappings.entrySet()) {
            if (pathMatcher.match(entry.getKey(), requestUri)) {
                matched = true;
                requiredRoles.addAll(entry.getValue());
            }
        }

        if (!matched) {
            // 보호해야 하는 주요 어드민/보안 경로 및 별칭 경로인 경우 구체적 DB 매핑이 없으면 fail-closed 차단
            for (String securePath : securePaths) {
                if (pathMatcher.match(securePath, requestUri)) {
                    log.warn("[DbUrlAuth] 보호 대상 보안 경로에 구체적인 DB 매핑 부재 (fail-closed) → 거부: {}", requestUri);
                    return new AuthorizationDecision(false);
                }
            }
            // 매핑에 없는 그 외 일반 URL → DB 인가 대상 아님 (Abstain)
            return null;
        }

        // 사용자 권한과 요구 롤 비교
        Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
        boolean granted = authorities.stream()
                .map(a -> a.getAuthority())
                .anyMatch(requiredRoles::contains);

        if (!granted) {
            log.debug("[DbUrlAuth] 접근 거부: URI={}, 사용자 권한={}, 요구 롤={}",
                    requestUri, authorities, requiredRoles);
        }

        return new AuthorizationDecision(granted);
    }

    /**
     * DB에서 URL → 요구 롤 매핑을 로드한다. Caffeine 캐시를 사용.
     */
    private Map<String, Set<String>> loadMappings() {
        if (jdbcTemplate == null) {
            log.warn("[DbUrlAuth] JdbcTemplate 부재 → 빈 매핑 반환 (fail-closed)");
            return Collections.emptyMap();
        }
        Map<String, Set<String>> result = cache.get(CACHE_KEY, key -> {
            try {
                Map<String, Set<String>> map = new LinkedHashMap<>();
                jdbcTemplate.query(LOAD_SQL, (rs) -> {
                    String url = rs.getString("url");
                    String roleId = rs.getString("role_id");
                    map.computeIfAbsent(url, k -> new LinkedHashSet<>()).add(roleId);
                });
                log.info("[DbUrlAuth] DB에서 URL 인가 매핑 로드 완료: {} 개 패턴", map.size());
                return map;
            } catch (Exception e) {
                log.error("[DbUrlAuth] DB 매핑 로드 실패 (fail-closed): {}", e.getMessage());
                return Collections.emptyMap();
            }
        });
        return result != null ? result : Collections.emptyMap();
    }

    /** 캐시 무효화. 권한 매핑 변경 시 호출한다. */
    public void evictCache() {
        cache.invalidateAll();
        log.info("[DbUrlAuth] 캐시 무효화 완료");
    }
}
