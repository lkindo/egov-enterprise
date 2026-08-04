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
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 📄 springdoc 설정 선언 동기화 린터 — 운영 스펙과 <b>스펙을 산출하는 테스트</b>가 갈라지는 것을 막는다.
 *
 * <p>[왜 필요한가] {@code api-docs.json} 은 {@code OpenApiDocumentationTest} 가 만든다. 그런데
 * {@code api-server/src/test/resources/application.yml} 이 main 을 <b>shadow</b> 하므로, 운영
 * {@code application.yml} 의 springdoc 설정은 그 테스트 컨텍스트에 <b>도달하지 못한다</b>.
 * 그래서 테스트가 {@code @TestPropertySource} 로 같은 값을 다시 선언한다 — <b>같은 값이 두 곳에 있다</b>.
 *
 * <p>둘이 갈라지면 산출된 스펙이 운영 런타임과 다른 문서가 된다. 그리고 그 드리프트는 조용하다 —
 * 스펙은 여전히 생성되고 계약 게이트({@code codegen:verify})도 <b>생성된 스펙끼리만</b> 비교하므로
 * "문서가 실제 API 를 서술하지 못한다" 는 상태를 아무도 알려주지 않는다.
 * 종전에는 <b>양쪽 주석</b>("반드시 동일하게 유지할 것")만이 동기화를 강제하고 있었다(§0.7-H5 의
 * '실행 경로 없는 규칙').
 *
 * <p>[F-2 맥락] 결정 원장은 국소 {@code @ParameterObject}(28파일 35개소)를 권했으나 이행분은
 * 전역 스위치({@code springdoc.default-flat-param-object})다. <b>전역 스위치를 유지</b>하기로 하고
 * (산출 스펙의 수치 결과가 같고, 35개소 부착으로 되돌리는 것은 순수 비용이다), 원장이 지적한
 * "적용 범위 통제 상실" 은 이 게이트 + 기존 api-docs 드리프트 게이트로 대체한다 —
 * 스펙이 달라지면 {@code api-docs.json} diff 로 드러나고, 설정이 갈라지면 여기서 red 다.
 *
 * <p><b>이 게이트가 보장하지 <u>않는</u> 것</b>: 설정 <b>값이 옳은지</b>는 보지 않는다.
 * 두 선언이 같다는 것만 본다.
 */
class SpringdocDeclarationSyncLinterTest {

    private static final Logger log = LoggerFactory.getLogger(SpringdocDeclarationSyncLinterTest.class);

    private static final String PROD_YML = "api-server/src/main/resources/application.yml";
    private static final String SPEC_TEST = "api-server/src/test/java/nuri/openapi/OpenApiDocumentationTest.java";

    /**
     * 두 선언이 반드시 일치해야 하는 springdoc 키.
     * <b>예외 목록이 아니라 대조 대상</b>이다 — 줄어들면 감시 범위가 조용히 축소되므로 매니페스트로 동결한다.
     */
    private static final List<String> SYNCHRONIZED_KEYS = List.of(
            "default-flat-param-object");

    @Test
    @DisplayName("📄 springdoc 설정이 운영 yml 과 스펙 산출 테스트에서 동일하다 — 문서가 운영을 서술하지 못하는 드리프트 차단")
    void auditSpringdocDeclarationsAreInSync() throws IOException {
        Path root = resolveRepoRoot();
        String prodYml = read(root.resolve(PROD_YML));
        String specTest = read(root.resolve(SPEC_TEST));

        List<String> problems = new ArrayList<>();

        for (String key : SYNCHRONIZED_KEYS) {
            // 운영 yml: `  default-flat-param-object: true`
            String prodValue = firstGroup(prodYml, Pattern.compile(
                    "^\\s*" + Pattern.quote(key) + "\\s*:\\s*(\\S+)\\s*$", Pattern.MULTILINE));
            // 테스트: `"springdoc.default-flat-param-object=true"`
            String testValue = firstGroup(specTest, Pattern.compile(
                    "springdoc\\." + Pattern.quote(key) + "\\s*=\\s*([^\"]+)\""));

            if (prodValue == null) {
                problems.add(key + " — 운영 " + PROD_YML + " 에 선언이 없다");
                continue;
            }
            if (testValue == null) {
                problems.add(key + " — 스펙 산출 테스트(" + SPEC_TEST + ")에 선언이 없다."
                        + " 테스트 리소스가 main 을 shadow 하므로 여기 없으면 그 값은 도달하지 않는다");
                continue;
            }
            if (!prodValue.equals(testValue.trim())) {
                problems.add(key + " — 값 불일치: 운영=" + prodValue + " / 스펙산출=" + testValue.trim());
            }
        }

        if (!problems.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("📄 [SPRINGDOC SYNC GATE] 스펙을 만드는 설정과 운영 설정이 갈라졌습니다!\n");
            sb.append("========================================================================\n");
            problems.forEach(p -> sb.append("❌ ").append(p).append('\n'));
            sb.append("\n💡 api-docs.json 은 OpenApiDocumentationTest 가 만든다. 테스트 리소스가 main 을 shadow 하므로\n");
            sb.append("   운영 yml 의 springdoc 설정은 그 컨텍스트에 도달하지 않는다 — 그래서 두 곳에 같은 값을 둔다.\n");
            sb.append("   둘이 갈라지면 산출된 문서가 운영 API 를 서술하지 못하며, 그 드리프트는 조용하다.\n");
            fail(sb.toString());
        }

        log.info("✅ springdoc 선언 {}개 키가 운영 yml 과 스펙 산출 테스트에서 일치.", SYNCHRONIZED_KEYS.size());
    }

    private String read(Path path) throws IOException {
        if (!Files.isRegularFile(path)) {
            fail("게이트 무결성 파손: 대조 대상 파일이 없다 — " + path.toAbsolutePath()
                    + " (경로가 바뀌었다면 이 린터의 상수도 함께 갱신할 것)");
        }
        return Files.readString(path, StandardCharsets.UTF_8);
    }

    private String firstGroup(String content, Pattern pattern) {
        Matcher m = pattern.matcher(content);
        return m.find() ? m.group(1) : null;
    }

    private Path resolveRepoRoot() {
        Path cwd = Paths.get("").toAbsolutePath();
        return Files.isDirectory(cwd.resolve("api-server")) ? cwd : cwd.getParent();
    }
}
