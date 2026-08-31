package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 📦 응답 계약 린터 — 백엔드 헌법 제6조·제3조 2항을 <b>실행되는 게이트</b>로 결속한다.
 *
 * <p>[왜 필요한가] 헌법 제6조는 "모든 API 응답은 공통 래퍼 {@code ApiResponse} 를 사용해야 한다",
 * 제3조 2항은 "외부와의 데이터 교환은 반드시 전용 DTO 를 통해서만" 이라고 규정한다. 그런데
 * <b>그 두 조문에 결속된 게이트가 하나도 없었다</b>. 제3조 1항(엔티티 노출 금지)만
 * {@code ArchitectureTest} 로 결속돼 있었고, 나머지는 prose-only 규칙이었다 —
 * AGENTS.md Evidence guardrails H5 가 지목한 "게이트가 있다는 서술만 남고 집행은 0" 상태다.
 *
 * <p>[왜 census 인가] 현행 위반을 즉시 전부 고치는 것은 이 게이트의 목적이 아니다.
 * {@code Map} 반환 1건({@code DashboardApiController})은 foundation 의
 * {@code DashboardItemProvider} SPI 시그니처에 페이로드가 규정돼 있어 typed 이행이 SPI 계약 변경을
 * 동반한다. 그래서 <b>지금 있는 이탈을 동결</b>한다. 늘어나면 red 이고, <b>줄어도 red</b> 다 —
 * 정당한 상환 시에만 상수가 함께 바뀌어 diff 에 의도가 남는다.
 *
 * <p>[binary 허용 census — 제6조 3항] wrapper 밖 반환은 2026-08-23 헌법 제6조 3항(사용자 위임 D4)이
 * 제한적으로 명문화한 binary/stream 예외다. 익명 개수 동결이 아니라 <b>파일명·핸들러 단위 명시
 * census</b>({@link #BINARY_ALLOWED_HANDLERS})로 강화한다 — 목록 밖 {@code ResponseEntity<Resource>}
 * 신설도 red, 목록에 남은 stale 행도 red 인 <b>양방향 exact-match</b> 라서, grow-only 예외
 * 화이트리스트({@code EXCLUDED_*} — H2 가 금지하는 신호 은폐 패턴)와 달리 어느 방향의 변경도
 * diff 에 의도가 남는다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 소스 스캔이다.
 */
@Tag("governance-harness")
class ResponseContractLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ResponseContractLinterTest.class);

    private static final String CONTROLLER_BASE = "api-server/src/main/java/nuri/api/controller";

    /** 핸들러 선언(메서드 레벨 매핑). 클래스 레벨 {@code @RequestMapping} 은 세지 않는다. */
    private static final Pattern HANDLER_MAPPING = Pattern.compile(
            "@(?:Get|Post|Put|Patch|Delete|Request)Mapping\\b[^\\n]*\\n(?:\\s*@[^\\n]*\\n)*\\s*"
                    + "public\\s+([^\\n{]+?)\\s+(\\w+)\\s*\\(");

    /** 비정형 payload — 전용 DTO 가 아니라 Map/Object 로 내보내는 반환형. */
    private static final Pattern UNTYPED_PAYLOAD = Pattern.compile(
            "ApiResponse\\s*<\\s*(?:Map\\s*<|Object\\b|\\?)");

    /** 성공 응답이 공통 래퍼를 거치는가. */
    private static final Pattern WRAPPED = Pattern.compile("ApiResponse\\s*<");

    /**
     * 비정형 payload 동결(2026-08-31 실측 0건).
     *
     * <p>{@code DashboardApiController#getDashboardData}도 내부 provider SPI의 확장 Map은
     * 유지하면서 외부 응답을 {@code DashboardResponse}로 투영해 마지막 비정형 payload를
     * 상환했다. 새 Map/Object 응답이 생기면 이 exact census가 즉시 red가 된다.
     *
     * <p><b>[2026-08-29] 5 → 1</b>. 저위험 4건을 전용 DTO 로 상환했다 —
     * {@code HealthCheckApiController#checkHealth}({@code HealthStatusResponse}),
     * {@code MenuUserApiController#getHeadMenu}·{@code #getLeftMenu}({@code MenuListResponse}),
     * {@code SatisfactionApiController#getAverage}({@code SatisfactionAverageResponse}).
     * 만족도 이행은 표현 변경이 아니라 <b>결함 수정</b>이었다 — {@code Map.of} 가 null 값을 담지
     * 못해 "평가 없음"(서비스의 {@code null})을 0.0 으로 뭉개고 있었고, 같은 핸들러의
     * {@code @Operation} 설명은 정반대("0 과 구분해야 한다")를 약속하고 있었다.
     *
     * <p>피해는 실측된다 — {@code frontend/src/types/generated-api.d.ts} 의
     * {@code ApiResponseMapStringObject.data} 는 {@code Record<string, never>} 로 생성돼
     * <b>어떤 값도 담을 수 없는 타입</b>이다. Map 반환은 DB→DTO→Zod 계약 체인을 무력화한다.
     */
    private static final int UNTYPED_PAYLOAD_COUNT = 0;

    /**
     * 헌법 제6조 3항 binary/stream 예외의 허용 census — <b>파일 경로 {@code #} 핸들러 메서드</b> 단위.
     *
     * <p>[등재 조건 — 제6조 3항] ① {@code Content-Disposition: attachment} ② 명시적 {@code produces}
     * (동적 타입 다운로드는 응답 시점 {@code Content-Type} 지정으로 갈음) ③ 이 목록 등재.
     * 이 린터가 기계 강제하는 것은 ③ 이고, ①·② 는 각 엔드포인트의 컨트롤러 테스트가 헤더로 검증한다.
     *
     * <p>[행별 근거]
     * <ul>
     *   <li>{@code FileApiController#downloadFile} — 파일 다운로드. JSON 래퍼로 감싸면 base64 로
     *       전송량이 33% 늘고 전량 메모리 적재에 브라우저 네이티브 다운로드도 불가하다(2026-08-20 동결분).</li>
     *   <li>{@code LoginLogApiController#exportLoginLogs} — 로그인 로그 전체 결과 xlsx export
     *       (2026-08-23 사용자 위임 D4). SXSSF 스트리밍 + 행 상한 400 가드.</li>
     *   <li>{@code SystemLogApiController#exportSystemLogs} · {@code UserLogApiController#exportUserLogs}
     *       · {@code WebLogApiController#exportWebLogs} · {@code PrivacyLogApiController#exportPrivacyLogs}
     *       — 나머지 로그 4종의 전체 결과 xlsx export(2026-08-26). 로그인 로그와 같은 규칙을
     *       {@code LogExcelExport} 로 공유한다: 검색 조건은 목록 API 와 동일 바인딩, 페이지 파라미터만
     *       전량으로 덮어쓰기, 행 상한 초과 시 400, SXSSF 스트리밍.
     *       <p>이 4개가 없던 동안 화면은 <b>현재 페이지만</b> 반출할 수 있었고, A6 의 "서버측 전체
     *       내보내기" 필수 항목이 로그인 로그에서만 충족됐다.</li>
     * </ul>
     *
     * <p>실제 wrapper 밖 반환 집합과 이 목록은 <b>양방향 exact-match</b> 다 — 목록 밖 신설도,
     * stale 행 잔존도 red. 광역 패턴(디렉터리·와일드카드) 등재는 금지한다(파일명·메서드 단위 명시).
     */
    private static final String LOG_CONTROLLER_DIR =
            "api-server/src/main/java/nuri/api/controller/foundation/controller/system/log/";

    private static final Set<String> BINARY_ALLOWED_HANDLERS = Set.of(
            "api-server/src/main/java/nuri/api/controller/business/file/FileApiController.java#downloadFile",
            LOG_CONTROLLER_DIR + "LoginLogApiController.java#exportLoginLogs",
            LOG_CONTROLLER_DIR + "SystemLogApiController.java#exportSystemLogs",
            LOG_CONTROLLER_DIR + "UserLogApiController.java#exportUserLogs",
            LOG_CONTROLLER_DIR + "WebLogApiController.java#exportWebLogs",
            LOG_CONTROLLER_DIR + "PrivacyLogApiController.java#exportPrivacyLogs");

    /** 스캔 붕괴로 인한 vacuous 통과 차단용 하한(실측 325건 대비 여유). */
    private static final int HANDLER_FLOOR = 250;

    @Test
    @DisplayName("📦 응답 계약 census — 비정형 payload·래퍼 밖 반환 동결 (헌법 제6조·제3조 2항)")
    void auditResponseContractCensus() throws IOException {
        Path base = HarnessSourceIndex.repoRoot().resolve(CONTROLLER_BASE);
        List<Path> sources = HarnessSourceIndex.javaSources(base);

        List<String> untyped = new ArrayList<>();
        List<String> unwrapped = new ArrayList<>();
        Set<String> unwrappedHandlers = new TreeSet<>();
        int handlers = 0;

        for (Path source : sources) {
            String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                    HarnessSourceIndex.read(source));
            String relative = HarnessSourceIndex.repoRoot().relativize(source).toString().replace('\\', '/');

            Matcher handler = HANDLER_MAPPING.matcher(code);
            while (handler.find()) {
                handlers++;
                String returnType = handler.group(1).trim();
                String method = handler.group(2);
                if (UNTYPED_PAYLOAD.matcher(returnType).find()) {
                    untyped.add(relative + "#" + method + " => " + returnType);
                } else if (!WRAPPED.matcher(returnType).find()) {
                    unwrapped.add(relative + "#" + method + " => " + returnType);
                    unwrappedHandlers.add(relative + "#" + method);
                }
            }
        }

        List<String> violations = new ArrayList<>();

        // 스캔이 조용히 붕괴하면 census 가 비어 통과한다 — 그것이 가장 값싼 우회다.
        if (handlers < HANDLER_FLOOR) {
            violations.add("핸들러 스캔 하한 미달: " + handlers + " < " + HANDLER_FLOOR
                    + " — 경로/정규식 파손 의심. 빈 census 로 통과시키지 않습니다.");
        }

        writeActual("build/harness/response-contract-untyped.actual.txt", untyped);
        writeActual("build/harness/response-contract-unwrapped.actual.txt", unwrapped);

        if (untyped.size() != UNTYPED_PAYLOAD_COUNT) {
            violations.add("비정형 payload(Map/Object) 반환이 " + UNTYPED_PAYLOAD_COUNT
                    + " → " + untyped.size() + " 로 변했습니다:\n   " + String.join("\n   ", untyped)
                    + "\n   늘었다면 전용 DTO 로 바꾸십시오(제3조 2항). 줄였다면 상수를 낮춰 되돌릴 수 없게 하십시오.");
        }

        // binary 허용 census — 양방향 exact-match (제6조 3항).
        for (String actualHandler : unwrappedHandlers) {
            if (!BINARY_ALLOWED_HANDLERS.contains(actualHandler)) {
                violations.add("binary 허용 census 밖의 공통 래퍼(ApiResponse) 밖 반환 신설: " + actualHandler
                        + "\n   binary/stream 이 아니라면 제6조 위반입니다. 정당한 binary/stream 이면"
                        + " 제6조 3항의 3조건(attachment·produces·census 등재)을 충족하고"
                        + " BINARY_ALLOWED_HANDLERS 에 근거와 함께 등재하십시오.");
            }
        }
        for (String allowed : BINARY_ALLOWED_HANDLERS) {
            if (!unwrappedHandlers.contains(allowed)) {
                violations.add("binary 허용 census 의 stale 행: " + allowed
                        + "\n   해당 핸들러가 사라졌거나 래퍼 반환으로 바뀌었습니다."
                        + " 목록에서 제거해 census 를 실제와 일치시키십시오(잔존 행은 미래 우회 슬롯이 됩니다).");
            }
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("📦 [RESPONSE CONTRACT LINTER] 응답 계약 이탈이 변동했습니다!\n");
            sb.append("========================================================================\n");
            violations.forEach(v -> sb.append("❌ ").append(v).append('\n'));
            sb.append("\n💡 이 게이트는 현행 이탈을 '동결' 한다. 늘어도 red, 줄어도 red 다 —\n");
            sb.append("   정당한 상환/등재일 때만 상수·census 가 함께 바뀌어 diff 에 의도가 남게 하기 위해서다.\n");
            sb.append("   binary census 는 파일명·메서드 단위 양방향 exact-match 다(제6조 3항).\n");
            sb.append("   grow-only 예외 목록(EXCLUDED_*)을 만드는 방향으로 해소하지 말 것(AGENTS.md H2).\n");
            fail(sb.toString());
        }

        log.info("✅ 응답 계약 census 일치 — 핸들러 {}건, 비정형 {}건, 래퍼 밖 {}건.",
                handlers, untyped.size(), unwrapped.size());
    }

    /**
     * [2026-08-31 신설] 정규식 census 의 <b>손실 방어</b> — 컴파일된 클래스 표면과 교차 검증한다.
     *
     * <p>{@link #HANDLER_MAPPING} 은 시그니처가 한 줄임을 전제한다. 반환형이 줄바꿈되거나
     * 비{@code public} 핸들러가 생기면 그 핸들러는 census 에서 <b>조용히 빠지고</b>, 동결 상수가
     * 0 인 지금은 {@code Map} 반환이 숨으면 red 가 아니라 <b>false green</b> 이 된다.
     * {@code HANDLER_FLOOR} 는 대량 붕괴만 잡는다 — 한두 건의 누락은 통과한다.
     *
     * <p>그래서 reflection 으로 같은 파일들의 메서드 레벨 매핑 애노테이션을 세어 <b>정확히 같은
     * 집합</b>임을 요구한다. 정규식이 못 본 핸들러가 하나라도 있으면 이 테스트가 그 목록을 들고
     * red 가 된다. (reflection 쪽만 있는 항목 = 정규식 손실, 정규식 쪽만 있는 항목 = 파싱 오탐.)
     */
    @Test
    @DisplayName("📦 핸들러 census 손실 방어 — 정규식 추출 ↔ 컴파일 표면 exact 교차 검증")
    void handlerCensusMatchesCompiledSurface() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        Path base = repoRoot.resolve(CONTROLLER_BASE);
        List<Class<? extends java.lang.annotation.Annotation>> mappings = List.of(
                org.springframework.web.bind.annotation.GetMapping.class,
                org.springframework.web.bind.annotation.PostMapping.class,
                org.springframework.web.bind.annotation.PutMapping.class,
                org.springframework.web.bind.annotation.PatchMapping.class,
                org.springframework.web.bind.annotation.DeleteMapping.class,
                org.springframework.web.bind.annotation.RequestMapping.class);

        List<String> scanned = new ArrayList<>();
        List<String> compiled = new ArrayList<>();
        String sourcePrefix = "api-server/src/main/java/";

        for (Path source : HarnessSourceIndex.javaSources(base)) {
            String relative = repoRoot.relativize(source).toString().replace('\\', '/');
            String code = HarnessBaselineIntegrityTest.stripCommentsPreservingStrings(
                    HarnessSourceIndex.read(source));
            Matcher handler = HANDLER_MAPPING.matcher(code);
            while (handler.find()) {
                scanned.add(relative + "#" + handler.group(2));
            }

            String fqn = relative.substring(sourcePrefix.length(), relative.length() - ".java".length())
                    .replace('/', '.');
            try {
                collectMappedMethods(Class.forName(fqn, false, getClass().getClassLoader()),
                        relative, mappings, compiled);
            } catch (ClassNotFoundException e) {
                fail("게이트 무결성 파손: 컨트롤러 소스의 컴파일 클래스를 찾지 못했습니다 — " + fqn
                        + " (조용한 skip 은 교차 검증을 무력화합니다)");
            }
        }

        java.util.Collections.sort(scanned);
        java.util.Collections.sort(compiled);
        if (!scanned.equals(compiled)) {
            List<String> onlyCompiled = new ArrayList<>(compiled);
            scanned.forEach(onlyCompiled::remove);
            List<String> onlyScanned = new ArrayList<>(scanned);
            compiled.forEach(onlyScanned::remove);
            fail("핸들러 census 교차 검증 실패 — 정규식 추출과 컴파일 표면이 다릅니다.\n"
                    + "  · 정규식이 놓친 핸들러(시그니처 줄바꿈·비public 등 — census 손실 = false-green 경로): "
                    + (onlyCompiled.isEmpty() ? "없음" : "\n      " + String.join("\n      ", onlyCompiled)) + "\n"
                    + "  · 정규식만 잡은 항목(파싱 오탐): "
                    + (onlyScanned.isEmpty() ? "없음" : "\n      " + String.join("\n      ", onlyScanned)));
        }

        log.info("✅ 핸들러 census 교차 검증 OK — 정규식 {}건 == 컴파일 표면 {}건.", scanned.size(), compiled.size());
    }

    /** 최상위·중첩 클래스의 메서드 레벨 매핑을 수집(합성·bridge 메서드 제외). */
    private static void collectMappedMethods(Class<?> type, String relative,
            List<Class<? extends java.lang.annotation.Annotation>> mappings, List<String> out) {
        for (java.lang.reflect.Method method : type.getDeclaredMethods()) {
            if (method.isSynthetic() || method.isBridge()) {
                continue;
            }
            if (mappings.stream().anyMatch(method::isAnnotationPresent)) {
                out.add(relative + "#" + method.getName());
            }
        }
        for (Class<?> nested : type.getDeclaredClasses()) {
            collectMappedMethods(nested, relative, mappings, out);
        }
    }

    private static void writeActual(String relative, List<String> values) throws IOException {
        Path out = HarnessSourceIndex.repoRoot().resolve(relative);
        java.nio.file.Files.createDirectories(out.getParent());
        java.nio.file.Files.write(out, new TreeSet<>(values), StandardCharsets.UTF_8);
    }

    @SuppressWarnings("unused")
    private static String sha256Short(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(String.format("%02x", digest[i]));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
