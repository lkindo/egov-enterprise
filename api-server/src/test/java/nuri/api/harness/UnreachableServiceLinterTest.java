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
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🕳️ <b>도달 불가 서비스</b> 회귀 방지 게이트 — "완성돼 있는데 아무도 부르지 않는" 코드를 막는다.
 *
 * <p>[근거] 같은 결함이 <b>2026-08-05~06 사이에만 세 번</b> 나왔다.
 * <ul>
 *   <li>D-1 사용자 로그 — {@code UserLogRepositoryImpl.searchUserLogs} 는 구현돼 있고 화면도 있었는데
 *       DTO·서비스·컨트롤러가 없어 28,104행이 수집되기만 하고 볼 수 없었다(#300).</li>
 *   <li>D-4 설문 응답자 — {@code SurveyRespondentService} 5메서드 + 설문별 검색 술어까지 완비인데
 *       컨트롤러가 없었다(#301).</li>
 *   <li>D-8 게시글 만족도 — {@code SatisfactionService} 11메서드 완비인데 컨트롤러가 없었다(#302).</li>
 * </ul>
 *
 * <p><b>왜 아무 게이트에도 안 걸렸나</b>: 셋 다 <b>유일한 참조가 단위 테스트</b>였다. 테스트가 있으니
 * 커버리지도 잡히고 컴파일도 통과해서 <b>정적 지표로는 "구현됨"</b> 으로 보인다. 도달 가능성은
 * 아무도 재지 않았다.
 *
 * <p><b>왜 단순한 죽은 코드보다 나쁜가</b>: 도달 불가는 <b>결함을 숨긴다.</b>
 * D-4 응답자 서비스는 {@code srvyId} 를 받고 무시해 설문 간 개인정보가 섞였고, D-8 만족도 서비스는
 * {@code pswd} 를 받고 검사하지 않아 임의 삭제가 가능했다. 둘 다 파라미터를 받아 버리는 같은 유형이며
 * <b>노출되지 않았기에 드러나지 않았다</b>. 즉 배선은 "연결" 이 아니라 그동안 검증된 적 없는 코드를
 * 처음 실전에 올리는 일이다.
 *
 * <p>[규칙] {@code @Service} 가 붙은 클래스가 <b>자기 파일을 제외한 생산 코드({@code src/main}) 어디에서도
 * 이름이 등장하지 않으면</b> 위반이다.
 *
 * <p>[오탐 0 우선 설계] {@code HandlerReachesServiceLinterTest} 의 설계 철학을 따른다 — 확실한
 * 부분집합만 잡고, 애매하면 통과시킨다.
 * <ul>
 *   <li><b>인터페이스 구현체 면제</b>: {@code implements XxxService} 인 경우 스프링은 인터페이스로
 *       주입하므로 구현체 이름이 안 보이는 것이 정상이다. 인터페이스 이름이 생산 코드에 있으면 통과.
 *       (실측: 이 면제가 없으면 {@code AuthServiceImpl}·{@code LocalFileStorageService}·
 *       {@code UserAbsenceServiceImpl} 3건이 거짓 red 가 된다.)</li>
 *   <li><b>단순 이름 등장으로 판정</b>: 필드 주입뿐 아니라 import·생성자 파라미터·제네릭 파라미터·
 *       문자열 어디든 이름이 보이면 통과다. 호출 그래프를 따지지 않으므로 판정은 항상 관대하다.</li>
 *   <li><b>주석·문자열도 세지 않는다</b>: 주석에만 이름이 있으면 통과시킨다 — 이것은 <b>의도된 관대함</b>
 *       이다. 주석 제거 후 재검사하면 더 엄격해지지만 그만큼 오탐이 는다.</li>
 * </ul>
 *
 * <p>[예외 목록 없음] 2026-08-06 기준 위반 4건({@code CodeService}·{@code IndividualPageService}·
 * {@code MemoTodoService}·{@code TemplateService})을 <b>전부 삭제한 뒤</b> 이 게이트를 도입했다.
 * 예외 목록으로 출발하면 그 목록이 곧 서랍이 된다 — 없어도 되는 예외 목록은 만들지 않는다(§0.7-H2).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 텍스트 스캔.
 */
class UnreachableServiceLinterTest {

    private static final Logger log = LoggerFactory.getLogger(UnreachableServiceLinterTest.class);

    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};

    /** 클래스 레벨 {@code @Service} 선언(주석 처리된 것은 제외되도록 줄 시작 기준). */
    private static final Pattern SERVICE_ANNOTATION = Pattern.compile("(?m)^\\s*@Service\\b");

    /** {@code implements A, B} 에서 첫 인터페이스명을 뽑는다. */
    private static final Pattern IMPLEMENTS = Pattern.compile("\\bimplements\\s+([A-Za-z0-9_]+)");

    @Test
    @DisplayName("🕳️ @Service 빈이 생산 코드에서 도달 가능한가 — '완성됐는데 아무도 안 부르는' 코드 차단")
    void auditUnreachableServices() throws IOException {
        Path root = repoRoot();
        List<Path> mainSources = new ArrayList<>();
        for (String module : MODULES) {
            Path srcMain = root.resolve(module).resolve("src/main/java");
            if (Files.isDirectory(srcMain)) {
                try (Stream<Path> s = Files.walk(srcMain)) {
                    s.filter(p -> p.toString().endsWith(".java")).forEach(mainSources::add);
                }
            }
        }

        // 파일당 1회만 읽는다 — 서비스 수 × 파일 수 만큼 재읽기하면 수 분이 걸린다.
        Map<Path, String> corpus = new LinkedHashMap<>();
        for (Path p : mainSources) {
            corpus.put(p, Files.readString(p, StandardCharsets.UTF_8));
        }

        List<String> violations = new ArrayList<>();
        int serviceCount = 0;

        for (Map.Entry<Path, String> entry : corpus.entrySet()) {
            String src = entry.getValue();
            if (!SERVICE_ANNOTATION.matcher(src).find()) {
                continue;
            }
            serviceCount++;

            Path file = entry.getKey();
            String simpleName = file.getFileName().toString().replace(".java", "");

            if (referencedElsewhere(corpus, file, simpleName)) {
                continue;
            }

            // 인터페이스 구현체는 인터페이스로 주입된다 — 그 이름이 제3의 파일에 보이면 도달 가능하다.
            //
            // ⚠ '제3의' 가 핵심이다. 인터페이스 <b>자기 선언 파일</b>까지 참조로 세면 그 파일은 항상
            //   존재하므로 면제가 무조건 성립하고, 결과적으로 모든 *Impl 서비스가 사각지대가 된다.
            //   (2026-08-06 위반 주입 검증에서 실제로 이 구멍이 드러났다 — 인터페이스도 아무도 안 쓰는
            //    구현체를 주입했는데 게이트가 green 이었다. 그린만 확인했다면 못 잡았을 결함이다.)
            Matcher im = IMPLEMENTS.matcher(src);
            if (im.find()) {
                String iface = im.group(1);
                Path ifaceFile = declarationFileOf(corpus, iface);
                if (referencedElsewhere(corpus, file, ifaceFile, iface)) {
                    continue;
                }
            }

            violations.add(String.format(
                    "%s%n       %s%n       -> [해결책] 컨트롤러를 붙여 실제로 노출하거나, 쓰지 않을 것이면 삭제하십시오."
                            + " ⚠ 노출 전에 인가를 반드시 검토할 것 — 이 부류는 검증된 적이 없어 결함을 품고 있습니다.",
                    simpleName, root.relativize(file).toString().replace('\\', '/')));
        }

        log.info("[UNREACHABLE SERVICE LINTER] @Service {}개 스캔, 위반 {}건", serviceCount, violations.size());

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🕳️ [UNREACHABLE SERVICE LINTER] 생산 코드에서 도달 불가한 @Service 감지!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n단위 테스트만 참조하는 서비스는 '구현됨' 으로 보이지만 실제로는 한 번도 실행된 적이 없습니다.\n");
            sb.append("2026-08-05~06 에 같은 형태가 세 번 나왔고(D-1/D-4/D-8), 그중 둘은 인가 결함을 품고 있었습니다.\n");
            fail(sb.toString());
        }
    }

    /** {@code target} 이름이 {@code self} 를 제외한 생산 코드에 등장하는가. */
    private boolean referencedElsewhere(Map<Path, String> corpus, Path self, String target) {
        return referencedElsewhere(corpus, self, null, target);
    }

    /**
     * {@code target} 이름이 {@code self}·{@code alsoExclude} 를 <b>둘 다</b> 제외한 생산 코드에 등장하는가.
     *
     * <p>{@code alsoExclude} 는 인터페이스 자기 선언 파일을 빼기 위한 것이다 — 자기 선언까지 세면
     * 어떤 인터페이스든 항상 "참조됨" 이 되어 면제가 무의미해진다.
     */
    private boolean referencedElsewhere(Map<Path, String> corpus, Path self, Path alsoExclude, String target) {
        Pattern word = Pattern.compile("\\b" + Pattern.quote(target) + "\\b");
        for (Map.Entry<Path, String> e : corpus.entrySet()) {
            if (e.getKey().equals(self) || e.getKey().equals(alsoExclude)) {
                continue;
            }
            if (word.matcher(e.getValue()).find()) {
                return true;
            }
        }
        return false;
    }

    /** {@code SimpleName.java} 파일을 찾는다. 없으면 {@code null}(외부 라이브러리 인터페이스 등). */
    private Path declarationFileOf(Map<Path, String> corpus, String simpleName) {
        String fileName = simpleName + ".java";
        for (Path p : corpus.keySet()) {
            if (p.getFileName().toString().equals(fileName)) {
                return p;
            }
        }
        return null;
    }

    /**
     * 저장소 루트 해석. 테스트 작업 디렉터리가 모듈이든 루트든 동작해야 한다
     * ({@code IdentityAxisLinterTest} 관행과 동일).
     */
    private Path repoRoot() {
        Path cwd = Paths.get("").toAbsolutePath();
        Path candidate = cwd;
        for (int i = 0; i < 4 && candidate != null; i++) {
            if (Files.isDirectory(candidate.resolve("business-core"))
                    && Files.isDirectory(candidate.resolve("api-server"))) {
                return candidate;
            }
            candidate = candidate.getParent();
        }
        return cwd;
    }
}
