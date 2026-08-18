package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 {@code rbac.db-auth.secure-paths} 선언 동기화 린터.
 *
 * <p>[무엇을 지키는가] 이 한 줄이 <b>URL 인가의 fail-closed 경계</b>다. 여기 매칭되는 요청은
 * 매핑이 없어도 거부되고, 매칭되지 않으면 {@code DbUrlAuthorizationManager} 가 abstain(null) 을
 * 반환해 <b>하위에서 허용으로 해석</b>된다. 목록이 곧 방어선이다.
 *
 * <p>[왜 게이트인가 — 실측 2026-08-04] {@code nuri.api.controller} 의 엔드포인트 358개 중
 * <b>235개(약 67%)가 인가 애노테이션 없이 이 목록 매칭만으로</b> {@code SecurityAuthAnnotationLinterTest}
 * 를 통과한다. 그런데 같은 값이 <b>세 곳에 복제</b>돼 있다 —
 * 운영({@code application.yml}) · 테스트 프로파일({@code application-test.yml}) ·
 * {@code RbacAuthorizationMatrixTest} 의 {@code @SpringBootTest(properties=…)}.
 * 셋이 갈라지면 <b>테스트는 실제 운영 경계가 아닌 것을 검증하게 된다</b>. 그때 그린은 아무 의미가 없다.
 * 현재 셋은 일치하지만, 그 일치를 강제하는 것은 아무것도 없었다(AGENTS.md Evidence guardrails H5의 '실행 경로 없는 규칙').
 *
 * <p><b>이 게이트가 보장하지 <u>않는</u> 것</b>: 목록의 <b>내용이 옳은지</b>는 보지 않는다.
 * URL 단위 인가는 원리적으로 소유권(IDOR)을 표현하지 못하므로, 여기 등재됐다는 사실이
 * "그 도메인의 인가가 충분하다" 는 뜻은 아니다. 이 게이트가 막는 것은 <b>세 선언의 이탈</b> 하나다.
 */
class SecurePathsDeclarationSyncLinterTest {

    private static final Logger log = LoggerFactory.getLogger(SecurePathsDeclarationSyncLinterTest.class);

    /** 선언 지점 3곳. 줄어들면 커버리지가 조용히 축소되므로 매니페스트로 동결한다. */
    private static final List<String> DECLARATION_SITES = List.of(
            "api-server/src/main/resources/application.yml",
            "api-server/src/test/resources/application-test.yml",
            "api-server/src/test/java/nuri/security/RbacAuthorizationMatrixTest.java");

    /** yml 의 {@code secure-paths: "…"} 과 java 의 {@code rbac.db-auth.secure-paths=…} 를 함께 잡는다. */
    private static final Pattern DECLARATION =
            Pattern.compile("secure-paths\\s*[:=]\\s*\"?([^\"\\n]+?)\"?\\s*$", Pattern.MULTILINE);

    @Test
    @DisplayName("🔗 secure-paths 세 선언(운영·테스트 프로파일·매트릭스 테스트)이 일치한다 — 검증 대상과 운영 경계의 이탈 차단")
    void auditSecurePathsDeclarationsAreInSync() throws IOException {
        Path root = resolveRepoRoot();
        Map<String, String> declarations = new LinkedHashMap<>();
        List<String> problems = new ArrayList<>();

        for (String site : DECLARATION_SITES) {
            Path file = root.resolve(site);
            if (!Files.isRegularFile(file)) {
                problems.add(site + " — 파일 없음(선언 지점이 이동·삭제됐다면 이 목록도 함께 갱신할 것)");
                continue;
            }
            String content = Files.readString(file, StandardCharsets.UTF_8);
            Matcher m = DECLARATION.matcher(content);
            if (!m.find()) {
                problems.add(site + " — secure-paths 선언을 찾지 못함");
                continue;
            }
            declarations.put(site, normalize(m.group(1)));
        }

        if (problems.isEmpty()) {
            String reference = declarations.get(DECLARATION_SITES.get(0));
            declarations.forEach((site, value) -> {
                if (!value.equals(reference)) {
                    problems.add(site + " — 운영 선언과 불일치\n      운영: " + reference + "\n      해당: " + value);
                }
            });
        }

        if (!problems.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [SECURE-PATHS SYNC GATE] URL 인가 경계 선언이 갈라졌습니다!\n");
            sb.append("========================================================================\n");
            problems.forEach(p -> sb.append("❌ ").append(p).append('\n'));
            sb.append("\n💡 이 목록은 fail-closed 경계다 — 매칭되지 않는 요청은 abstain(null) 이 되어 허용으로 해석된다.\n");
            sb.append("   테스트 선언이 운영과 다르면 그 테스트의 그린은 운영 경계를 증명하지 않는다.\n");
            sb.append("   운영 값을 바꿨다면 세 곳을 함께 바꾼다(그래야 diff 에 의도가 드러난다).\n");
            fail(sb.toString());
        }

        log.info("✅ secure-paths 선언 {}곳 일치 (항목 {}개).",
                declarations.size(), declarations.values().iterator().next().split(",").length);
    }

    /** 공백만 제거한다 — 순서·항목은 의미가 있으므로 정렬하지 않는다(정렬하면 순서 이탈을 놓친다). */
    private String normalize(String raw) {
        return raw.replace(" ", "").trim();
    }

    private Path resolveRepoRoot() {
        Path cwd = Paths.get("").toAbsolutePath();
        return Files.isDirectory(cwd.resolve("api-server")) ? cwd : cwd.getParent();
    }
}
