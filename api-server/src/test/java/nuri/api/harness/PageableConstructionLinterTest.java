package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧨 페이징 변환 재복제 차단 게이트 — {@code BaseSearchDto#toPageable()} 우회 금지.
 *
 * <p>[왜 필요한가] 2026-08-09 이전, 아래 두 줄이 서비스 계층에
 * <b>13개소·10개 파일로 바이트 단위 동일하게 복제</b>돼 있었다.
 * <pre>
 *   int pageIndex = Math.max(0, searchVO.getPageIndex() - 1);
 *   int pageUnit  = searchVO.getPageUnit() &gt; 0 ? searchVO.getPageUnit() : 10;
 * </pre>
 *
 * <p>이 복제를 드러낸 것은 <b>뮤테이션 테스트</b>였다. 같은 모양의 뮤턴트가 호출부마다 따로 살아남아,
 * 인증 스코프 한 곳에서만 생존 16개 중 10개가 이 두 줄이었다. 호출부마다 같은 테스트를 다시 쓰는 것은
 * 복제된 코드에 복제된 검증을 붙이는 일이라, 다음 서비스가 추가되면 그대로 되풀이된다.
 *
 * <p>[왜 추출만으로 끝내지 않는가] 추출은 <b>그 시점의 상태</b>일 뿐이다.
 * 새 목록 서비스를 쓰는 사람은 옆 파일을 복사하지 헬퍼를 찾지 않는다.
 * AGENTS.md Evidence guardrails H5가 못박은 대로 <b>실행 경로가 있어야 게이트다</b> —
 * "헬퍼를 쓰자"는 규약은 그 규약을 모르는 사람을 막지 못한다.
 *
 * <p>[규칙] 생산 코드({@code src/main/java})에서 다음을 금지한다.
 * <ol>
 *   <li>{@code Math.max(0, ...getPageIndex() - 1)} — 1-based→0-based 변환의 손수 재구현</li>
 *   <li>{@code getPageUnit() > 0 ? ... : 10} — 페이지 크기 기본값 분기의 손수 재구현</li>
 *   <li>{@code PageRequest.of(search.getPageIndex(), search.getPageUnit())} — import/FQN/static import 를
 *       불문한 직접 getter 우회</li>
 * </ol>
 * 둘 중 하나라도 나타나면 위반이다. 올바른 형태는 {@code searchVO.toPageable()} 이며,
 * 정렬이 필요하면 {@code searchVO.toPageable(Sort.by(...))} 오버로드를 쓴다.
 *
 * <p>[무엇을 금지하지 않는가] {@code PageRequest.of(...)} 자체는 막지 않는다.
 * {@code BaseSearchDto} 와 무관한 고정 페이징(예: {@code PageRequest.of(0, 1)} 로 총건수만 세는 쿼리)은
 * 정당한 용법이고, 그것까지 막으면 헬퍼를 억지로 끼워 넣는 우회를 부른다.
 * 이 게이트가 겨냥하는 것은 <b>BaseSearchDto 로부터의 변환 로직 재구현</b> 하나다.
 *
 * <p>{@link BaseSearchDto} 를 받는 MVC model attribute 는 반드시 {@code @Valid} 로 실제 Bean Validation 을
 * 집행한다. DTO에 제약만 선언하고 controller가 검증을 호출하지 않는 false-green을 별도 census로 막는다.
 *
 * <p>[예외 목록 없음] 도입 시점 위반 0건이다.
 * 예외 목록으로 출발하면 그 목록이 곧 서랍이 된다(AGENTS.md Evidence guardrails H2).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 텍스트 스캔.
 */
@Tag("governance-harness")
class PageableConstructionLinterTest {

    private static final Logger log = LoggerFactory.getLogger(PageableConstructionLinterTest.class);

    private static final String[] MODULES = {"foundation", "business-core", "business-app", "api-server"};

    /**
     * 1-based → 0-based 변환의 손수 재구현.
     * <p>수신 변수명은 자유(pageIndex/idx/…), 대상은 {@code getPageIndex()} 를 부르는 임의 식이다.
     * 종전 13개소는 전부 {@code searchVO} 였지만, 변수명을 바꿔 우회하는 것까지 막는다.
     */
    private static final Pattern MANUAL_PAGE_INDEX =
            Pattern.compile("Math\\s*\\.\\s*max\\s*\\(\\s*0\\s*,[^;]*?\\.getPageIndex\\s*\\(\\s*\\)\\s*-\\s*1");

    /**
     * 페이지 크기 기본값 분기의 손수 재구현 — {@code getPageUnit() > 0 ? ... : <숫자>}.
     * <p>기본값 숫자는 10 으로 한정하지 않는다. 다른 숫자를 쓰는 것은 통일을 깨는 쪽이라 더 나쁘다.
     */
    private static final Pattern MANUAL_PAGE_UNIT =
            Pattern.compile("\\.getPageUnit\\s*\\(\\s*\\)\\s*>\\s*0\\s*\\?[^;]*?:\\s*\\d+");

    /** import 단순명 또는 inline FQN 으로 호출한 PageRequest.of(...) 안의 BaseSearchDto getter. */
    private static final Pattern DIRECT_PAGE_REQUEST_GETTER = Pattern.compile(
            "(?s)(?:\\bPageRequest|org\\.springframework\\.data\\.domain\\.PageRequest)"
                    + "\\s*\\.\\s*of\\s*\\((?:(?!\\);).)*?"
                    + "\\.get(?:PageIndex|PageUnit|RecordCountPerPage)\\s*\\(");

    private static final Pattern STATIC_PAGE_REQUEST_OF_IMPORT = Pattern.compile(
            "^\\s*import\\s+static\\s+org\\.springframework\\.data\\.domain\\.PageRequest\\.of\\s*;",
            Pattern.MULTILINE);

    private static final Pattern STATIC_OF_GETTER = Pattern.compile(
            "(?s)\\bof\\s*\\((?:(?!\\);).)*?\\.get(?:PageIndex|PageUnit|RecordCountPerPage)\\s*\\(");

    private static final Pattern BASE_SEARCH_MODEL_ATTRIBUTE = Pattern.compile(
            "@ModelAttribute(?:\\s*\\([^)]*\\))?\\s+"
                    + "(?:nuri\\.business\\.domain\\.common\\.)?BaseSearchDto\\b");

    private static final Pattern VALID_BASE_SEARCH_MODEL_ATTRIBUTE = Pattern.compile(
            "@Valid\\s+@ModelAttribute(?:\\s*\\([^)]*\\))?\\s+"
                    + "(?:nuri\\.business\\.domain\\.common\\.)?BaseSearchDto\\b");

    private static final int EXPECTED_BASE_SEARCH_MODEL_ATTRIBUTES = 28;

    @Test
    @DisplayName("red proof: import/FQN/static-import PageRequest 우회와 직접 getter 를 모두 탐지한다")
    void detectsEveryPageRequestBypassForm() {
        List<String> fixtures = List.of(
                "import org.springframework.data.domain.PageRequest; class X { void x(BaseSearchDto s) { PageRequest.of(s.getPageIndex() - 1, s.getPageUnit()); } }",
                "class X { void x(BaseSearchDto s) { org.springframework.data.domain.PageRequest.of(s.getPageIndex() - 1, s.getPageUnit()); } }",
                "import static org.springframework.data.domain.PageRequest.of; class X { void x(BaseSearchDto s) { of(s.getPageIndex() - 1, s.getRecordCountPerPage()); } }"
        );

        for (String fixture : fixtures) {
            assertEquals(1, findViolations("fixture.java", fixture).size(), fixture);
        }
    }

    @Test
    @DisplayName("red proof: BaseSearchDto 와 무관한 고정 PageRequest 는 허용한다")
    void allowsFixedPageRequestConstruction() {
        assertTrue(findViolations("fixture.java",
                "import org.springframework.data.domain.PageRequest; class X { void x() { PageRequest.of(0, 1); } }")
                .isEmpty());
    }

    @Test
    @DisplayName("🧨 페이징 변환을 손수 재구현하지 않는가 — BaseSearchDto#toPageable() 우회 차단")
    void auditManualPageableConstruction() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int scanned = 0;

        for (Path f : HarnessSourceIndex.productionJavaSources(MODULES)) {
            String rel = root.relativize(f).toString().replace('\\', '/');
            // 헬퍼 자신은 당연히 이 계산을 갖는다 — 유일한 정당한 보유자다.
            if (rel.endsWith("nuri/business/domain/common/BaseSearchDto.java")) {
                continue;
            }
            scanned++;
            violations.addAll(findViolations(rel, HarnessSourceIndex.read(f)));
        }

        log.info("[PageableConstructionLinter] 생산 소스 {}개 스캔, 위반 {}건", scanned, violations.size());

        // 스캔 대상이 0이면 게이트가 vacuous 하게 통과한다 — 그 자체를 실패로 본다.
        if (scanned == 0) {
            fail("생산 소스를 하나도 스캔하지 못했다 — 게이트가 무의미하게 통과하고 있다. 경로 해석을 확인하라.");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("페이징 변환 재구현 ").append(violations.size()).append("건 — ");
            sb.append("이 계산은 BaseSearchDto#toPageable() 한 곳에만 있어야 한다.\n");
            violations.forEach(v -> sb.append("  · ").append(v).append('\n'));
            sb.append("\n올바른 형태:\n");
            sb.append("  Pageable pageable = searchVO.toPageable();\n");
            sb.append("  Pageable pageable = searchVO.toPageable(Sort.by(\"컬럼\").ascending());  // 정렬이 필요하면\n");
            sb.append("\n복제하면 호출부마다 같은 뮤턴트가 따로 살아남는다 — 종전 13개소가 정확히 그 상태였다.\n");
            fail(sb.toString());
        }
    }

    @Test
    @DisplayName("BaseSearchDto MVC model attribute 28건이 모두 @Valid 를 집행한다")
    void auditBaseSearchDtoModelAttributesAreValidated() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int all = 0;
        int validated = 0;

        for (Path source : HarnessSourceIndex.productionJavaSources("api-server")) {
            String relative = root.relativize(source).toString().replace('\\', '/');
            String code = stripComments(HarnessSourceIndex.read(source));
            int sourceAll = count(BASE_SEARCH_MODEL_ATTRIBUTE, code);
            int sourceValidated = count(VALID_BASE_SEARCH_MODEL_ATTRIBUTE, code);
            all += sourceAll;
            validated += sourceValidated;
            if (sourceAll != sourceValidated) {
                violations.add(relative + " — BaseSearchDto model attribute " + sourceAll
                        + "건 중 @Valid " + sourceValidated + "건");
            }
        }

        if (all != EXPECTED_BASE_SEARCH_MODEL_ATTRIBUTES) {
            violations.add("BaseSearchDto model attribute census가 " + EXPECTED_BASE_SEARCH_MODEL_ATTRIBUTES
                    + " → " + all + " 로 변했습니다. 추가/삭제된 binding의 validation 의미를 검토하십시오.");
        }
        if (validated != all) {
            violations.add("@Valid 집행 누락: 전체 " + all + "건, validated " + validated + "건");
        }
        if (!violations.isEmpty()) {
            fail(String.join("\n", violations));
        }
    }

    static List<String> findViolations(String relative, String source) {
        String code = stripComments(source);
        List<String> violations = new ArrayList<>();

        Matcher idx = MANUAL_PAGE_INDEX.matcher(code);
        while (idx.find()) {
            violations.add(relative + " — 1-based→0-based 변환을 손수 구현: `"
                    + squeeze(idx.group()) + "`");
        }

        Matcher unit = MANUAL_PAGE_UNIT.matcher(code);
        while (unit.find()) {
            violations.add(relative + " — 페이지 크기 기본값 분기를 손수 구현: `"
                    + squeeze(unit.group()) + "`");
        }

        Matcher direct = DIRECT_PAGE_REQUEST_GETTER.matcher(code);
        while (direct.find()) {
            violations.add(relative + " — PageRequest.of 에 BaseSearchDto getter 직접 전달: `"
                    + squeeze(direct.group()) + "`");
        }

        if (STATIC_PAGE_REQUEST_OF_IMPORT.matcher(code).find()) {
            Matcher staticCall = STATIC_OF_GETTER.matcher(code);
            while (staticCall.find()) {
                violations.add(relative + " — static PageRequest.of 에 BaseSearchDto getter 직접 전달: `"
                        + squeeze(staticCall.group()) + "`");
            }
        }
        return violations;
    }

    private static int count(Pattern pattern, String source) {
        int count = 0;
        Matcher matcher = pattern.matcher(source);
        while (matcher.find()) count++;
        return count;
    }

    /**
     * 줄 주석과 블록 주석을 제거한다. 주석에 적힌 예시 코드까지 위반으로 세면
     * <b>이 클래스의 javadoc 자체가 위반</b>이 되는 자기모순이 생긴다.
     */
    private static String stripComments(String src) {
        String noBlock = src.replaceAll("(?s)/\\*.*?\\*/", " ");
        return noBlock.replaceAll("(?m)//.*$", " ");
    }

    /** 위반 메시지에 넣기 위해 줄바꿈·연속 공백을 한 칸으로 줄인다. */
    private static String squeeze(String s) {
        return s.replaceAll("\\s+", " ").trim();
    }

}
