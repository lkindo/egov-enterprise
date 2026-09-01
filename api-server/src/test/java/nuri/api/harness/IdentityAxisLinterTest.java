package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 정체성 축(esntlId vs loginId) 회귀 방지 게이트 — quality-score §2.E.
 *
 * <p>[근거] §2.E "정체성 모델의 근원적 혼란": {@code getUsername()}=esntlId 인데 감사/소유권=loginId 라는
 * footgun 이 poll 이중투표·IDOR·OTP 등 여러 버그의 공통 원인이었다. {@code SecurityUtil} 로 축을 분리
 * ({@code getCurrentEsntlId} vs {@code getCurrentLoginId})하고 축을 뒤섞던 {@code getCurrentUserId} 를
 * {@code @Deprecated} + 프로덕션 호출 0 으로 소거했다(identity-model-guide.md 규약화). 이 게이트는 그
 * 봉합을 <b>기계로 못박아</b> 회귀(축 혼용 accessor 재사용·도메인 코드의 SecurityContext 직접 접근)를 차단한다.
 *
 * <p>순수 정적 소스 텍스트 스캔(모듈 main 소스). SchemaNamingLinterTest 의 경로 해석 관행을 재사용한다.
 */
@Tag("governance-harness")
class IdentityAxisLinterTest {

    private static final Logger log = LoggerFactory.getLogger(IdentityAxisLinterTest.class);
    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};

    /** 축을 뒤섞던 deprecated accessor — 프로덕션 호출 0 을 유지한다(정의부 SecurityUtil 은 제외). */
    private static final Pattern GET_CURRENT_USER_ID_CALL = Pattern.compile("\\.getCurrentUserId\\s*\\(");

    /** 도메인 코드가 SecurityUtil 을 우회해 SecurityContext 를 직접 캐는 패턴. */
    private static final Pattern DIRECT_SECURITY_CONTEXT =
            Pattern.compile("SecurityContextHolder\\.getContext\\s*\\(\\s*\\)\\.getAuthentication\\s*\\(");

    /**
     * [동결 베이스라인] SecurityContext 직접 접근이 정당한 인프라 클래스(정규 accessor·JPA 감사·리졸버·
     * 인증 필터/컨트롤러/인터셉터). <b>신규 추가 금지</b> — 도메인 서비스는 SecurityUtil 을 경유한다.
     */
    private static final Set<String> DIRECT_CONTEXT_ALLOWED = new TreeSet<>(Arrays.asList(
            "SecurityUtil.java",                    // 정규 accessor(esntlId/loginId 분리 제공)
            "LoginUserAuditorAware.java",           // JPA @CreatedBy/@LastModifiedBy = loginId 소스
            "LoginUserArgumentResolver.java",       // @LoginUser 아규먼트 리졸버
            "JwtAuthenticationFilter.java",         // 인증 컨텍스트 설정(setAuthentication)
            "AuthApiController.java",               // 인증 컨트롤러(me/logout)
            "OperationalAuditInterceptor.java",     // 운영 감사 인터셉터(loginId 우선)
            "MenuService.java"                      // [동결] 메뉴 가시성 — 향후 SecurityUtil 경유로 정리 여지
    ));

    @Test
    @DisplayName("🔗 정체성 축 회귀 방지 — getCurrentUserId 프로덕션 호출 0 + SecurityContext 직접접근 동결 (§2.E)")
    void auditIdentityAxis() throws IOException {
        List<Path> files = collectMainJava();
        // 게이트 무결성(false-green 방지)
        if (files.size() < 100) {
            fail("게이트 무결성 파손: main .java 스캔(" + files.size() + ")이 예상 하한(100) 미만 — 경로/스캔 파손 의심.");
        }

        List<String> userIdViolations = new ArrayList<>();
        List<String> contextViolations = new ArrayList<>();

        for (Path p : files) {
            String fileName = p.getFileName().toString();
            String src = stripComments(HarnessSourceIndex.read(p));

            // 1) getCurrentUserId 호출 — 정의부(SecurityUtil)는 제외, 그 외 호출은 위반
            if (!fileName.equals("SecurityUtil.java") && GET_CURRENT_USER_ID_CALL.matcher(src).find()) {
                userIdViolations.add(rel(p));
            }

            // 2) SecurityContext 직접 접근 — allow-list 밖이면 위반
            if (!DIRECT_CONTEXT_ALLOWED.contains(fileName) && DIRECT_SECURITY_CONTEXT.matcher(src).find()) {
                contextViolations.add(rel(p));
            }
        }

        if (!userIdViolations.isEmpty() || !contextViolations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [IDENTITY AXIS LINTER] 정체성 축(esntlId/loginId) 회귀 감지! (§2.E)\n");
            sb.append("========================================================================\n");
            if (!userIdViolations.isEmpty()) {
                sb.append("❌ @Deprecated getCurrentUserId() 호출 — 축을 뒤섞는 accessor 입니다:\n");
                userIdViolations.forEach(v -> sb.append("   ").append(v).append("\n"));
                sb.append("   → 감사/소유권엔 SecurityUtil.getCurrentLoginId(), 시스템 PK엔 getCurrentEsntlId() 를 쓰세요.\n");
            }
            if (!contextViolations.isEmpty()) {
                sb.append("❌ SecurityContextHolder 직접 접근(allow-list 밖) — 도메인 코드는 SecurityUtil 경유:\n");
                contextViolations.forEach(v -> sb.append("   ").append(v).append("\n"));
                sb.append("   → SecurityUtil.getCurrentLoginId()/getCurrentEsntlId() 를 쓰거나, 정당한 인프라면 사유와 함께 DIRECT_CONTEXT_ALLOWED 에 추가.\n");
            }
            sb.append("\n💡 규약: docs/03-guides/identity-model-guide.md · SecurityUtil(esntlId=시스템PK, loginId=감사/소유권).\n");
            fail(sb.toString());
        } else {
            log.info("✅ 정체성 축 회귀 없음(getCurrentUserId 프로덕션 호출 0, SecurityContext 직접접근 동결 {}종). §2.E 규약 준수.",
                    DIRECT_CONTEXT_ALLOWED.size());
        }
    }

    // ---- 소스 수집(멀티모듈 main) --------------------------------------------------

    private List<Path> collectMainJava() throws IOException {
        return HarnessSourceIndex.productionJavaSources(MODULES);
    }

    /** cwd 또는 상위에서 settings.gradle 을 가진 저장소 루트를 찾는다(SchemaNamingLinter 경로해석 관행). */
    private static Path resolveRepoRoot() {
        // [2026-08-31] 공용 인덱스에 위임 — 7개 사본의 로직 드리프트(무음 폴백 포함)를 제거했다.
        return HarnessSourceIndex.repoRoot();
    }

    private static String rel(Path p) {
        String s = p.toString().replace('\\', '/');
        int idx = s.indexOf("/src/main/java/");
        return idx >= 0 ? s.substring(s.lastIndexOf('/', idx - 1) + 1) : p.getFileName().toString();
    }

    private static String stripComments(String raw) {
        String noBlock = raw.replaceAll("(?s)/\\*.*?\\*/", "");
        return Arrays.stream(noBlock.split("\r?\n", -1))
                .map(line -> {
                    int idx = line.indexOf("//");
                    return idx >= 0 ? line.substring(0, idx) : line;
                })
                .collect(Collectors.joining("\n"));
    }
}
