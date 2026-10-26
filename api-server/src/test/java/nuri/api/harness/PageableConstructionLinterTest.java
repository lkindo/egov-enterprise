package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import nuri.api.support.PaginationRequestFilter;
import nuri.business.domain.common.BaseSearchDto;
import nuri.business.support.PageableTestResolvers;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.Set;
import java.util.TreeSet;
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
 * <p>[ADR-0036 페이징 규약] 목록의 페이지는 요청·응답·URL·화면 모두 1 기반 {@code page}·{@code size} 하나다.
 * 같은 불변식을 보는 이 게이트를 넓혀 다음도 막는다(새 게이트를 만들지 않는다 — AGENTS 거버넌스 총량 관리).
 * <ol>
 *   <li>컨트롤러가 페이지 값을 {@code @RequestParam int page/pageIndex/size…} 로 직접 받는 세 번째 변환 경로.</li>
 *   <li>main·test application.yml, 시험용 리졸버, HTTP 경계, BaseSearchDto 의 페이징 설정이 서로 다른 상태.</li>
 *   <li>시험 소스가 운영과 다른 기본 리졸버({@code new PageableHandlerMethodArgumentResolver()})를 직접 만드는 것.</li>
 *   <li>{@code @UnsortedPageable} 로 받은 Pageable 을 정렬째 서비스에 넘기는 것(정렬 허용 범위 확대).</li>
 *   <li>스펙(api-docs.json)의 목록이 0 기반·옛 이름·상한 없는 크기·{@code PageResponse} 아닌 응답을 서술하는 것.</li>
 * </ol>
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 판정이다. 운영 컨텍스트의 실제 HTTP 동작은
 * {@code PaginationConventionIntegrationTest} 가 본다.
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

    // 수의 증감 이력은 git 과 결정 기록에 있다. 바인딩을 걷거나 더하면 이 수를 함께 고친다.
    private static final int EXPECTED_BASE_SEARCH_MODEL_ATTRIBUTES = 25;

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

    /*
     * [2026-10-26] 종전 주석 제거는 문자열을 구별하지 않는 정규식이라 같은 줄의 "https://…" 뒤 코드를 주석으로 지웠고(놓침),
     * 금지 호출을 설명하는 문자열은 코드로 셌다(오탐). 판정은 공용 마스킹(주석·문자열·text block 을 같은 길이로 가림)으로 한다.
     */
    @Test
    @DisplayName("red proof: 같은 줄의 URL 문자열 뒤 위반을 놓치지 않는다 — 문자열 속 // 는 주석이 아니다")
    void keepsCodeAfterUrlStrings() {
        assertEquals(1, findViolations("fixture.java",
                "class X { void x(BaseSearchDto s) { String u = \"https://example.test\"; int p = Math.max(0, s.getPageIndex() - 1); } }")
                .size());
        assertEquals(1, directPageParamViolations("fixture.java",
                "class X { String u = \"http://a\"; void x(@RequestParam(\"page\") int p) {} }").size());
    }

    @Test
    @DisplayName("red proof: 문자열·text block 속 금지 호출 예시는 위반으로 세지 않는다")
    void ignoresExamplesInsideStrings() {
        assertTrue(findViolations("fixture.java",
                "class X { String hint = \"Math.max(0, s.getPageIndex() - 1) 로 바꾸지 마십시오\"; }").isEmpty());
        assertTrue(findViolations("fixture.java",
                "class X { String hint = \"\"\"\n PageRequest.of(s.getPageIndex() - 1, s.getPageUnit())\n \"\"\"; }").isEmpty());
        assertTrue(directPageParamViolations("fixture.java",
                "class X { String doc = \"@RequestParam int page 대신 Pageable 을 받는다\"; }").isEmpty());
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
    @DisplayName("활성 BaseSearchDto MVC model attribute census가 모두 @Valid 를 집행한다")
    void auditBaseSearchDtoModelAttributesAreValidated() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int all = 0;
        int validated = 0;

        for (Path source : HarnessSourceIndex.productionJavaSources("api-server")) {
            String relative = root.relativize(source).toString().replace('\\', '/');
            String code = HarnessSourceIndex.maskNonCode(HarnessSourceIndex.read(source));
            int sourceAll = count(BASE_SEARCH_MODEL_ATTRIBUTE, code);
            int sourceValidated = count(VALID_BASE_SEARCH_MODEL_ATTRIBUTE, code);
            all += sourceAll;
            validated += sourceValidated;
            if (sourceAll != sourceValidated) {
                violations.add(relative + " — BaseSearchDto model attribute " + sourceAll
                        + "건 중 @Valid " + sourceValidated + "건");
            }
        }

        if (all != ReusableHarnessProfile.current().count("baseSearchBindings", EXPECTED_BASE_SEARCH_MODEL_ATTRIBUTES)) {
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

    // ─────────────────────────────────────────────────────────────────────────
    // [ADR-0036] 페이징 규약 — 1 기반 page·size 하나
    // ─────────────────────────────────────────────────────────────────────────

    /** 페이지 값을 받던 이름들 — 컨트롤러가 이 이름을 @RequestParam 으로 직접 받으면 세 번째 변환 경로가 된다. */
    private static final String PAGE_PARAM_NAMES = "page|pageIndex|pageUnit|size|pageSize|pageNo|recordCountPerPage";

    private static final Pattern DIRECT_PAGE_REQUEST_PARAM = Pattern.compile(
            "@RequestParam\\b(?:\\s*\\([^)]*\\))?\\s+(?:final\\s+)?(?:int|Integer|long|Long|short|Short)\\s+("
                    + PAGE_PARAM_NAMES + ")\\b"
                    + "|@RequestParam\\s*\\(\\s*(?:(?:value|name)\\s*=\\s*)?\"(" + PAGE_PARAM_NAMES + ")\"");

    private static final Pattern RESOLVER_CONSTRUCTION = Pattern.compile(
            "new\\s+(?:org\\.springframework\\.data\\.web\\.)?PageableHandlerMethodArgumentResolver\\s*\\(");

    private static final Pattern UNSORTED_PAGEABLE_PARAM = Pattern.compile(
            "@(?:nuri\\.api\\.support\\.)?UnsortedPageable\\s+(?:@[\\w.]+(?:\\([^)]*\\))?\\s+)*"
                    + "(?:org\\.springframework\\.data\\.domain\\.)?Pageable\\s+(\\w+)");

    /** 스펙에서 목록의 페이지 이름이 아닌 옛 이름 — 하나라도 남으면 생성 계약이 옛 이름을 허용한다. */
    static final Set<String> RETIRED_PAGE_NAMES = Set.of(
            "pageIndex", "pageUnit", "pageNo", "pageSize", "recordCountPerPage", "firstIndex", "lastIndex");

    /**
     * page·size 를 받지만 응답이 {@code PageResponse} 가 아닌 연산 — 각 행의 사유로만 둔다(양방향 exact).
     * xlsx 반출은 페이지 파라미터를 서버가 전량으로 덮어쓰는 바이너리 응답이고(헌법 제6조 3항),
     * 게시판 통합 검색은 최대 20건 배열을 돌려준다(ADR-0036 맥락 §4.2 — 이번 범위 밖).
     */
    static final Map<String, String> NON_PAGE_RESPONSE_LIST_OPERATIONS = Map.of(
            "GET /api/v1/boards/search", "통합 검색 — 최대 20건 배열(페이지 메타 없음)",
            "GET /api/v1/admin/system/logs/login/export.xlsx", "xlsx 전량 반출(바이너리)",
            "GET /api/v1/admin/system/logs/privacy/export.xlsx", "xlsx 전량 반출(바이너리)",
            "GET /api/v1/admin/system/logs/system/export.xlsx", "xlsx 전량 반출(바이너리)",
            "GET /api/v1/admin/system/logs/user/export.xlsx", "xlsx 전량 반출(바이너리)",
            "GET /api/v1/admin/system/logs/web/export.xlsx", "xlsx 전량 반출(바이너리)");

    private static final List<String> PAGE_RESPONSE_FIELDS = List.of("list", "total", "page", "size", "totalPage");

    @Test
    @DisplayName("red proof: 컨트롤러의 @RequestParam 페이지 값 직접 수신을 잡는다")
    void detectsDirectPageRequestParams() {
        assertEquals(1, directPageParamViolations("fixture.java",
                "class X { void x(@RequestParam(defaultValue = \"0\") int page) {} }").size());
        assertEquals(1, directPageParamViolations("fixture.java",
                "class X { void x(@RequestParam(value = \"pageIndex\", defaultValue = \"1\") Integer index) {} }").size());
        assertTrue(directPageParamViolations("fixture.java",
                "class X { void x(@RequestParam(defaultValue = \"\") String keyword, Pageable pageable) {} }").isEmpty());
    }

    @Test
    @DisplayName("🧨 컨트롤러는 페이지 값을 @RequestParam 으로 직접 받지 않는다 — Pageable 또는 BaseSearchDto 하나 (ADR-0036)")
    void controllersDoNotReceivePageValuesDirectly() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int scanned = 0;
        for (Path source : HarnessSourceIndex.javaSources(root.resolve("api-server/src/main/java/nuri/api/controller"))) {
            scanned++;
            violations.addAll(directPageParamViolations(root.relativize(source).toString().replace('\\', '/'),
                    HarnessSourceIndex.read(source)));
        }
        if (scanned == 0) fail("컨트롤러 소스를 하나도 스캔하지 못했다 — 경로 해석을 확인하라.");
        if (!violations.isEmpty()) {
            fail("페이지 값 직접 수신 " + violations.size() + "건 — 목록은 Pageable(@PageableDefault) 또는 @Valid BaseSearchDto 로 받는다."
                    + " 1 기반 변환과 범위 검증은 리졸버·PaginationRequestFilter 한 곳이다(ADR-0036).\n  · "
                    + String.join("\n  · ", violations));
        }
    }

    static List<String> directPageParamViolations(String relative, String source) {
        List<String> violations = new ArrayList<>();
        // 파라미터 이름을 문자열 값(@RequestParam("page"))으로도 받으므로 주석만 가린다. 찾은 @RequestParam 이 문자열 안의 예시가
        //   아니라 코드인지는 문자열까지 가린 원문에서 본다 — 같은 오프셋이다.
        String code = HarnessSourceIndex.maskNonCode(source);
        Matcher matcher = DIRECT_PAGE_REQUEST_PARAM.matcher(HarnessSourceIndex.maskComments(source));
        while (matcher.find()) {
            if (code.charAt(matcher.start()) != '@') continue;
            violations.add(relative + " — 페이지 값 직접 수신: `" + squeeze(source.substring(matcher.start(), matcher.end())) + "`");
        }
        return violations;
    }

    @Test
    @DisplayName("red proof: 한쪽만 바꾼 페이징 설정을 잡는다")
    void detectsDivergentPageableSettings() {
        Properties main = pageableProperties("true", "100");
        Properties drifted = pageableProperties("false", "100");
        List<String> mismatches = pageableSettingMismatches(main, drifted, true, 100, 100, 100);
        assertTrue(mismatches.stream().anyMatch(m -> m.contains("test application.yml")), mismatches.toString());
        assertTrue(pageableSettingMismatches(main, main, true, 100, 100, 101).stream()
                .anyMatch(m -> m.contains("BaseSearchDto.MAX_PAGE_UNIT")));
        assertTrue(pageableSettingMismatches(main, main, true, 100, 100, 100).isEmpty());
    }

    @Test
    @DisplayName("🧨 main·test 설정, 시험 리졸버, HTTP 경계, BaseSearchDto 의 페이징 값이 같다 (ADR-0036)")
    void pageableSettingsAgreeEverywhere() {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> mismatches = pageableSettingMismatches(
                yaml(root.resolve("api-server/src/main/resources/application.yml")),
                yaml(root.resolve("api-server/src/test/resources/application.yml")),
                PageableTestResolvers.ONE_INDEXED_PARAMETERS, PageableTestResolvers.MAX_PAGE_SIZE,
                PaginationRequestFilter.MAX_SIZE, BaseSearchDto.MAX_PAGE_UNIT);
        if (!mismatches.isEmpty()) {
            fail("페이징 설정이 갈라졌다 — 시험이 운영과 다른 기준을 검증하며 green 이 된다(ADR-0036, ADR-0024 결정 2 와 같은 함정).\n  · "
                    + String.join("\n  · ", mismatches));
        }
    }

    static List<String> pageableSettingMismatches(Properties main, Properties test, boolean factoryOneIndexed,
            int factoryMaxSize, int filterMaxSize, int dtoMaxSize) {
        List<String> mismatches = new ArrayList<>();
        String oneIndexed = main.getProperty("spring.data.web.pageable.one-indexed-parameters");
        String maxSize = main.getProperty("spring.data.web.pageable.max-page-size");
        if (!"true".equals(oneIndexed)) {
            mismatches.add("main application.yml 의 spring.data.web.pageable.one-indexed-parameters 가 true 가 아니다: " + oneIndexed);
        }
        if (!Objects.equals(oneIndexed, test.getProperty("spring.data.web.pageable.one-indexed-parameters"))) {
            mismatches.add("test application.yml 의 one-indexed-parameters 가 main 과 다르다: "
                    + test.getProperty("spring.data.web.pageable.one-indexed-parameters"));
        }
        if (!Objects.equals(maxSize, test.getProperty("spring.data.web.pageable.max-page-size"))) {
            mismatches.add("test application.yml 의 max-page-size 가 main 과 다르다: "
                    + test.getProperty("spring.data.web.pageable.max-page-size"));
        }
        if (factoryOneIndexed != Boolean.parseBoolean(oneIndexed)) {
            mismatches.add("PageableTestResolvers.ONE_INDEXED_PARAMETERS 가 main 과 다르다: " + factoryOneIndexed);
        }
        for (Map.Entry<String, Integer> limit : Map.of(
                "PageableTestResolvers.MAX_PAGE_SIZE", factoryMaxSize,
                "PaginationRequestFilter.MAX_SIZE", filterMaxSize,
                "BaseSearchDto.MAX_PAGE_UNIT", dtoMaxSize).entrySet()) {
            if (!String.valueOf(limit.getValue()).equals(maxSize)) {
                mismatches.add(limit.getKey() + "(" + limit.getValue() + ") 가 main 의 max-page-size(" + maxSize + ") 와 다르다");
            }
        }
        return mismatches;
    }

    @Test
    @DisplayName("red proof: 시험 소스의 리졸버 직접 생성을 잡고 문자열 속 예시는 넘긴다")
    void detectsDirectResolverConstruction() {
        assertEquals(1, resolverConstructionViolations("Fixture.java",
                "class X { Object r = new org.springframework.data.web.PageableHandlerMethodArgumentResolver(); }").size());
        assertTrue(resolverConstructionViolations("Fixture.java",
                "class X { String s = \"new PageableHandlerMethodArgumentResolver()\"; }").isEmpty());
    }

    @Test
    @DisplayName("🧨 시험은 Pageable 리졸버를 PageableTestResolvers 로만 만든다 — 운영과 같은 1 기반 (ADR-0036)")
    void testSourcesUseSharedResolverFactory() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int scanned = 0;
        for (String dir : List.of("foundation/src/test/java", "business-core/src/test/java", "business-core/src/testFixtures/java",
                "business-app/src/test/java", "api-server/src/test/java")) {
            Path base = root.resolve(dir);
            if (!Files.isDirectory(base)) continue;
            for (Path source : HarnessSourceIndex.javaSources(base)) {
                String relative = root.relativize(source).toString().replace('\\', '/');
                if (relative.endsWith("nuri/business/support/PageableTestResolvers.java")) continue;
                scanned++;
                violations.addAll(resolverConstructionViolations(relative, HarnessSourceIndex.read(source)));
            }
        }
        if (scanned == 0) fail("시험 소스를 하나도 스캔하지 못했다 — 경로 해석을 확인하라.");
        if (!violations.isEmpty()) {
            fail("Pageable 리졸버 직접 생성 " + violations.size() + "건 — standalone MockMvc 가 운영과 달리 0 기반으로 해석한다."
                    + " nuri.business.support.PageableTestResolvers.standard() 를 쓰십시오.\n  · " + String.join("\n  · ", violations));
        }
    }

    static List<String> resolverConstructionViolations(String relative, String source) {
        List<String> violations = new ArrayList<>();
        Matcher matcher = RESOLVER_CONSTRUCTION.matcher(HarnessSourceIndex.maskNonCode(source));
        while (matcher.find()) {
            violations.add(relative + ":" + (source.substring(0, matcher.start()).split("\n", -1).length));
        }
        return violations;
    }

    @Test
    @DisplayName("red proof: @UnsortedPageable 을 정렬째 넘기는 핸들러를 잡는다")
    void detectsSortedPassThrough() {
        assertEquals(1, unsortedPassThroughViolations("Fixture.java",
                "class X { Object x(@UnsortedPageable Pageable page) { return repo.find(page); } }").size());
        assertTrue(unsortedPassThroughViolations("Fixture.java",
                "class X { Object x(@nuri.api.support.UnsortedPageable Pageable page) {"
                        + " return svc.list(PageRequests.unsorted(page), page.getPageNumber(), page.getPageSize()); } }").isEmpty());
        // [2026-10-26] 문자열 속 중괄호는 본문의 끝이 아니다 — 종전에는 "}" 에서 본문을 끊어 그 뒤의 정렬째 전달을 놓쳤다.
        assertEquals(1, unsortedPassThroughViolations("Fixture.java",
                "class X { Object x(@UnsortedPageable Pageable page) { String s = \"}\"; return repo.find(page); } }").size());
    }

    @Test
    @DisplayName("🧨 @UnsortedPageable 은 정렬을 걷어 넘긴다 — 옮긴 목록의 정렬 허용 범위를 넓히지 않는다 (ADR-0036)")
    void unsortedPageablesAreNotPassedThrough() throws IOException {
        Path root = HarnessSourceIndex.repoRoot();
        List<String> violations = new ArrayList<>();
        int found = 0;
        for (Path source : HarnessSourceIndex.javaSources(root.resolve("api-server/src/main/java/nuri/api/controller"))) {
            String code = HarnessSourceIndex.read(source);
            found += count(UNSORTED_PAGEABLE_PARAM, HarnessSourceIndex.maskNonCode(code));
            violations.addAll(unsortedPassThroughViolations(root.relativize(source).toString().replace('\\', '/'), code));
        }
        if (!ReusableHarnessProfile.current().projected() && found == 0) {
            fail("@UnsortedPageable 파라미터를 하나도 찾지 못했다 — 정규식·경로가 무너졌다(빈 통과 금지).");
        }
        if (!violations.isEmpty()) {
            fail("정렬째 넘긴 @UnsortedPageable " + violations.size() + "건 — PageRequests.unsorted(…) 나 번호·크기만 쓰십시오."
                    + " 스펙은 이 연산에서 sort 를 빼므로, 넘기면 문서에 없는 정렬을 받는다.\n  · " + String.join("\n  · ", violations));
        }
    }

    static List<String> unsortedPassThroughViolations(String relative, String source) {
        String code = HarnessSourceIndex.maskNonCode(source);
        List<String> violations = new ArrayList<>();
        Matcher param = UNSORTED_PAGEABLE_PARAM.matcher(code);
        while (param.find()) {
            String name = param.group(1);
            int open = code.indexOf('{', closingParen(code, param.end()));
            int close = matchingBrace(code, open);
            String body = code.substring(open, close)
                    .replaceAll("PageRequests\\s*\\.\\s*unsorted\\s*\\(\\s*" + name + "\\s*\\)", " ")
                    .replaceAll("\\b" + name + "\\s*\\.\\s*getPage(?:Number|Size)\\s*\\(\\s*\\)", " ");
            if (Pattern.compile("\\b" + name + "\\b").matcher(body).find()) {
                violations.add(relative + " — @UnsortedPageable " + name + " 를 정렬째 사용");
            }
        }
        return violations;
    }

    @Test
    @DisplayName("red proof: 스펙의 0 기반·옛 이름·상한 없는 크기·원형 Page 응답을 잡는다")
    void detectsSpecPagingViolations() {
        String spec = """
                {"paths":{
                  "/a":{"get":{"parameters":[{"name":"pageIndex","in":"query","schema":{"type":"integer"}}],
                        "responses":{"200":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ApiResponsePageResponseX"}}}}}}},
                  "/b":{"get":{"parameters":[
                        {"name":"page","in":"query","description":"Zero-based page index (0..N)","schema":{"type":"integer","minimum":0}},
                        {"name":"size","in":"query","schema":{"type":"integer","minimum":1}}],
                        "responses":{"200":{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ApiResponsePageStatus"}}}}}}}},
                 "components":{"schemas":{
                  "ApiResponsePageResponseX":{"properties":{"data":{"$ref":"#/components/schemas/PageResponseX"}}},
                  "PageResponseX":{"required":["list","total","page","size","totalPage"]},
                  "ApiResponsePageStatus":{"properties":{"data":{"$ref":"#/components/schemas/PageStatus"}}},
                  "PageStatus":{"properties":{"content":{},"number":{}}}}}}
                """;
        List<String> violations = pagingSpecViolations(json(spec), Map.of(), false);
        String joined = String.join("\n", violations);
        assertTrue(joined.contains("GET /a — 옛 페이지 이름 pageIndex"), joined);
        assertTrue(joined.contains("GET /a — page·size 중 하나만"), joined);
        assertTrue(joined.contains("GET /b — page 의 최솟값이 1 이 아니다"), joined);
        assertTrue(joined.contains("GET /b — page 가 0 기반으로 서술됐다"), joined);
        assertTrue(joined.contains("GET /b — size 의 최댓값이 100 이 아니다"), joined);
        assertTrue(joined.contains("GET /b — 응답이 PageResponse 가 아니다: PageStatus"), joined);
        assertTrue(pagingSpecViolations(json(spec), Map.of("GET /zzz", "사유"), false).stream()
                .anyMatch(v -> v.contains("stale")));
    }

    @Test
    @DisplayName("🧨 스펙의 모든 목록은 1 기반 page·상한 100 size 와 필수 다섯 필드의 PageResponse 를 서술한다 (ADR-0036)")
    void apiDocsListOperationsFollowPagingConvention() throws IOException {
        Path apiDocs = HarnessSourceIndex.repoRoot().resolve("api-docs.json");
        JsonNode root = json(HarnessSourceIndex.read(apiDocs));
        List<String> violations = pagingSpecViolations(root, NON_PAGE_RESPONSE_LIST_OPERATIONS,
                ReusableHarnessProfile.current().projected());
        if (!violations.isEmpty()) {
            fail("스펙의 목록 페이징이 규약과 다르다 — 생성 계약(zod)이 그대로 옮겨 프런트가 0 기반·옛 이름을 보낼 수 있다(ADR-0036).\n  · "
                    + String.join("\n  · ", violations));
        }
    }

    static List<String> pagingSpecViolations(JsonNode root, Map<String, String> nonPageResponse, boolean projected) {
        List<String> violations = new ArrayList<>();
        Set<String> listOperations = new TreeSet<>();
        JsonNode schemas = root.path("components").path("schemas");
        for (Iterator<Map.Entry<String, JsonNode>> paths = root.path("paths").properties().iterator(); paths.hasNext();) {
            Map.Entry<String, JsonNode> path = paths.next();
            for (Iterator<Map.Entry<String, JsonNode>> ops = path.getValue().properties().iterator(); ops.hasNext();) {
                Map.Entry<String, JsonNode> op = ops.next();
                String key = op.getKey().toUpperCase(java.util.Locale.ROOT) + " " + path.getKey();
                JsonNode page = null;
                JsonNode size = null;
                for (JsonNode parameter : op.getValue().path("parameters")) {
                    if (!"query".equals(parameter.path("in").asString())) continue;
                    String name = parameter.path("name").asString();
                    if (RETIRED_PAGE_NAMES.contains(name)) violations.add(key + " — 옛 페이지 이름 " + name);
                    if ("page".equals(name)) page = parameter;
                    if ("size".equals(name)) size = parameter;
                }
                boolean pageLike = page != null || size != null || violations.stream().anyMatch(v -> v.startsWith(key + " — 옛"));
                if (!pageLike) continue;
                listOperations.add(key);
                if (page == null || size == null) violations.add(key + " — page·size 중 하나만(또는 옛 이름만) 있다");
                if (page != null) {
                    if (page.path("schema").path("minimum").asInt(-1) != 1) violations.add(key + " — page 의 최솟값이 1 이 아니다");
                    if (page.path("description").asString("").contains("Zero-based")) violations.add(key + " — page 가 0 기반으로 서술됐다");
                }
                if (size != null) {
                    if (size.path("schema").path("minimum").asInt(-1) != 1) violations.add(key + " — size 의 최솟값이 1 이 아니다");
                    if (size.path("schema").path("maximum").asInt(-1) != PaginationRequestFilter.MAX_SIZE) {
                        violations.add(key + " — size 의 최댓값이 " + PaginationRequestFilter.MAX_SIZE + " 이 아니다");
                    }
                }
                if (nonPageResponse.containsKey(key)) continue;
                String dataSchema = pageDataSchema(op.getValue(), schemas);
                if (dataSchema == null || !dataSchema.startsWith("PageResponse")) {
                    violations.add(key + " — 응답이 PageResponse 가 아니다: " + dataSchema);
                    continue;
                }
                Set<String> required = new TreeSet<>();
                schemas.path(dataSchema).path("required").forEach(field -> required.add(field.asString()));
                if (!required.containsAll(PAGE_RESPONSE_FIELDS)) {
                    violations.add(key + " — " + dataSchema + " 의 필수 필드가 " + PAGE_RESPONSE_FIELDS + " 가 아니다: " + required);
                }
            }
        }
        if (!projected) {
            for (String exempt : nonPageResponse.keySet()) {
                if (!listOperations.contains(exempt)) violations.add("PageResponse 예외의 stale 행: " + exempt);
            }
        }
        return violations;
    }

    /** 성공 응답 봉투의 data 가 가리키는 스키마 이름. 봉투·참조가 아니면 null. */
    private static String pageDataSchema(JsonNode operation, JsonNode schemas) {
        for (Iterator<Map.Entry<String, JsonNode>> responses = operation.path("responses").properties().iterator(); responses.hasNext();) {
            Map.Entry<String, JsonNode> response = responses.next();
            if (!response.getKey().startsWith("2")) continue;
            for (JsonNode media : response.getValue().path("content")) {
                String envelope = refName(media.path("schema"));
                if (envelope == null) return null;
                return refName(schemas.path(envelope).path("properties").path("data"));
            }
        }
        return null;
    }

    private static String refName(JsonNode schema) {
        String ref = schema.path("$ref").asString("");
        return ref.isEmpty() ? null : ref.substring(ref.lastIndexOf('/') + 1);
    }

    private static Properties yaml(Path file) {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource(file));
        Properties properties = yaml.getObject();
        if (properties == null) fail("YAML 을 읽지 못했다: " + file);
        return properties;
    }

    private static Properties pageableProperties(String oneIndexed, String maxSize) {
        Properties properties = new Properties();
        properties.setProperty("spring.data.web.pageable.one-indexed-parameters", oneIndexed);
        properties.setProperty("spring.data.web.pageable.max-page-size", maxSize);
        return properties;
    }

    private static JsonNode json(String text) {
        return JsonMapper.builder().configureForJackson2().build().readTree(text);
    }

    /** {@code from} 이 파라미터 목록 안일 때 그 목록을 닫는 ')' 위치. */
    private static int closingParen(String code, int from) {
        int depth = 1;
        for (int i = from; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '(') depth++;
            else if (c == ')' && --depth == 0) return i;
        }
        throw new IllegalStateException("파라미터 목록이 닫히지 않는다");
    }

    private static int matchingBrace(String code, int open) {
        int depth = 0;
        for (int i = open; i < code.length(); i++) {
            char c = code.charAt(i);
            if (c == '{') depth++;
            else if (c == '}' && --depth == 0) return i + 1;
        }
        throw new IllegalStateException("메서드 본문이 닫히지 않는다");
    }

    static List<String> findViolations(String relative, String source) {
        // 판정은 주석·문자열을 가린 코드로 하고, 메시지 발췌는 같은 오프셋의 원문에서 뽑는다(가린 문자열이 빈칸으로 보이지 않게).
        String code = HarnessSourceIndex.maskNonCode(source);
        List<String> violations = new ArrayList<>();

        Matcher idx = MANUAL_PAGE_INDEX.matcher(code);
        while (idx.find()) {
            violations.add(relative + " — 1-based→0-based 변환을 손수 구현: `"
                    + squeeze(source.substring(idx.start(), idx.end())) + "`");
        }

        Matcher unit = MANUAL_PAGE_UNIT.matcher(code);
        while (unit.find()) {
            violations.add(relative + " — 페이지 크기 기본값 분기를 손수 구현: `"
                    + squeeze(source.substring(unit.start(), unit.end())) + "`");
        }

        Matcher direct = DIRECT_PAGE_REQUEST_GETTER.matcher(code);
        while (direct.find()) {
            violations.add(relative + " — PageRequest.of 에 BaseSearchDto getter 직접 전달: `"
                    + squeeze(source.substring(direct.start(), direct.end())) + "`");
        }

        if (STATIC_PAGE_REQUEST_OF_IMPORT.matcher(code).find()) {
            Matcher staticCall = STATIC_OF_GETTER.matcher(code);
            while (staticCall.find()) {
                violations.add(relative + " — static PageRequest.of 에 BaseSearchDto getter 직접 전달: `"
                        + squeeze(source.substring(staticCall.start(), staticCall.end())) + "`");
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

    /** 위반 메시지에 넣기 위해 줄바꿈·연속 공백을 한 칸으로 줄인다. */
    private static String squeeze(String s) {
        return s.replaceAll("\\s+", " ").trim();
    }

}
