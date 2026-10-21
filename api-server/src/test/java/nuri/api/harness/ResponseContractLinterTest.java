package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseStatus;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;
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
     * <p>Map 응답은 값의 형태를 숨겨 결함도 숨긴다 — {@code Map.of} 가 null 값을 담지 못해 "평가 없음"(서비스의 {@code null})을
     * 0.0 으로 뭉갠 만족도 평균이 실제 사례다. 전용 DTO 로 상환한 이력은 git 과 결정 기록에 있다.
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
     *       {@code XlsxExport}(종전 {@code LogExcelExport}) 로 공유한다: 검색 조건은 목록 API 와 동일 바인딩, 페이지 파라미터만
     *       전량으로 덮어쓰기, 행 상한 초과 시 400, SXSSF 스트리밍.
     *       <p>이 4개가 없던 동안 화면은 <b>현재 페이지만</b> 반출할 수 있었고, A6 의 "서버측 전체
     *       내보내기" 필수 항목이 로그인 로그에서만 충족됐다.</li>
     *   <li>{@code AuditJournalApiController#exportAuditJournal} — 민감 작업 감사 원장 전체 결과 xlsx 내보내기(2026-10-20).
     *       목록과 같은 조건, 같은 {@code XlsxExport} 행 상한, 사유 필수(감사 경계가 핸들러 전에 사유와 시도를 원장에 남긴다).</li>
     *   <li>{@code SurveySubmissionApiController#exportStats} — 설문 결과 통계 xlsx 반출(2026-09-26 DIP B5 F6).
     *       화면 통계와 같은 문항 × 항목 행이며 응답자 이름·기타 답은 싣지 않는다. 같은 {@code XlsxExport} 규칙.</li>
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
            LOG_CONTROLLER_DIR + "PrivacyLogApiController.java#exportPrivacyLogs",
            LOG_CONTROLLER_DIR + "AuditJournalApiController.java#exportAuditJournal",
            "api-server/src/main/java/nuri/api/controller/foundation/controller/system/service/survey/SurveySubmissionApiController.java#exportStats");

    /** 동일 바이너리 모집단을 개인정보 감사 게이트에서도 검증한다. */
    static Set<String> binaryAllowedHandlers() { return BINARY_ALLOWED_HANDLERS; }

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
            String code = HarnessSourceIndex.stripCommentsPreservingStrings(
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
        if (handlers < ReusableHarnessProfile.current().count("responseHandlers", HANDLER_FLOOR)) {
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
            // 재사용 투영에서 pack 과 함께 빠진 소스의 행만 건너뛴다(예: survey pack 이 없는 프로필의 설문 결과 반출).
            // 투영 계획에 없는 경로는 retainsSource 가 예외로 막으므로 사라진 파일을 임의로 선택 도메인으로 보지 않는다.
            if (!ReusableHarnessProfile.current().retainsSource(allowed)) continue;
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
            String code = HarnessSourceIndex.stripCommentsPreservingStrings(
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

    // ─────────────────────────────────────────────────────────────────────────
    // [ADR-0036] Spring Page 원형 금지 · 생성 응답 201 census (헌법 제6조 4·5항)
    // ─────────────────────────────────────────────────────────────────────────

    private static final Pattern RAW_SPRING_PAGE = Pattern.compile(
            "ApiResponse\\s*<\\s*(?:org\\.springframework\\.data\\.domain\\.)?(?:Page|Slice)\\s*<");

    private static final String CONTROLLER_PREFIX = "api-server/src/main/java/nuri/api/controller/";

    /**
     * 자원을 만드는 POST — {@code @ResponseStatus(CREATED)} + {@code ApiResponse.created(새 식별자)}. 파일#핸들러 양방향 exact.
     * 분류 기준·판단 근거는 ADR-0036 의 201 분류 표가 정본이다. 이름이 아니라 "새로 주소를 갖는 자원이 생기는가" 로 고른다(H4).
     */
    static final Set<String> CREATED_HANDLERS = Set.of(
            CONTROLLER_PREFIX + "business/addressbook/AddressBookApiController.java#createAddressBook",
            CONTROLLER_PREFIX + "business/admin/content/banner/BannerApiController.java#insertBanner",
            CONTROLLER_PREFIX + "business/admin/content/board/BoardMasterApiController.java#createBoardMaster",
            CONTROLLER_PREFIX + "business/admin/content/community/CommunityApiController.java#createCommunity",
            CONTROLLER_PREFIX + "business/admin/content/popup/PopupApiController.java#createPopup",
            CONTROLLER_PREFIX + "business/approval/ApprovalApiController.java#createApproval",
            CONTROLLER_PREFIX + "business/approval/ApprovalApiController.java#createApprovalTemporaryDraft",
            CONTROLLER_PREFIX + "business/approval/ApprovalApiController.java#createApprovalSavedLine",
            CONTROLLER_PREFIX + "business/board/BoardApiController.java#createPost",
            CONTROLLER_PREFIX + "business/board/BoardApiController.java#createPostWithFiles",
            CONTROLLER_PREFIX + "business/board/SatisfactionApiController.java#create",
            CONTROLLER_PREFIX + "business/comment/CommentApiController.java#createComment",
            CONTROLLER_PREFIX + "business/file/FileApiController.java#uploadFiles",
            CONTROLLER_PREFIX + "business/help/HelpApiController.java#insertHpcm",
            CONTROLLER_PREFIX + "business/help/HelpApiController.java#createManual",
            CONTROLLER_PREFIX + "business/mail/MailApiController.java#sendMail",
            CONTROLLER_PREFIX + "business/memoreport/MemoReportApiController.java#createMemoReport",
            CONTROLLER_PREFIX + "business/note/NoteApiController.java#sendNote",
            CONTROLLER_PREFIX + "business/notification/NotificationApiController.java#createNotification",
            CONTROLLER_PREFIX + "business/operation/EventApiController.java#createEvent",
            CONTROLLER_PREFIX + "business/operation/ExternalHrApiController.java#createExternalHr",
            CONTROLLER_PREFIX + "business/operation/RewardManageApiController.java#createReward",
            CONTROLLER_PREFIX + "business/poll/PollApiController.java#createPoll",
            CONTROLLER_PREFIX + "business/report/WorkReportApiController.java#createWorkReport",
            CONTROLLER_PREFIX + "business/smarttoolkit/DeptJobApiController.java#createDeptJobBox",
            CONTROLLER_PREFIX + "business/smarttoolkit/DeptJobApiController.java#createDeptJob",
            CONTROLLER_PREFIX + "business/smarttoolkit/ScheduleApiController.java#createSchedule",
            CONTROLLER_PREFIX + "business/smarttoolkit/ScrapApiController.java#createScrap",
            CONTROLLER_PREFIX + "business/sms/SmsApiController.java#sendSms",
            CONTROLLER_PREFIX + "foundation/controller/code/AdministCodeApiController.java#createAdministCode",
            CONTROLLER_PREFIX + "foundation/controller/code/CommonCodeApiController.java#createClCode",
            CONTROLLER_PREFIX + "foundation/controller/code/CommonCodeApiController.java#createCmmnCode",
            CONTROLLER_PREFIX + "foundation/controller/code/CommonCodeApiController.java#createDetailCode",
            CONTROLLER_PREFIX + "foundation/controller/system/AuthorizationApiController.java#copyGroup",
            CONTROLLER_PREFIX + "foundation/controller/system/AuthorizationApiController.java#createGroup",
            CONTROLLER_PREFIX + "foundation/controller/system/GroupApiController.java#createGroup",
            CONTROLLER_PREFIX + "foundation/controller/system/login/LoginPolicyApiController.java#insertLoginPolicy",
            CONTROLLER_PREFIX + "foundation/controller/system/MenuApiController.java#createMenu",
            CONTROLLER_PREFIX + "foundation/controller/system/policy/PolicyApiController.java#createPolicy",
            CONTROLLER_PREFIX + "foundation/controller/system/service/survey/SurveyApiController.java#insertTemplate",
            CONTROLLER_PREFIX + "foundation/controller/system/service/survey/SurveyApiController.java#insertSurvey",
            CONTROLLER_PREFIX + "foundation/controller/system/service/survey/SurveyApiController.java#copySurvey",
            CONTROLLER_PREFIX + "foundation/controller/system/service/survey/SurveyApiController.java#insertQuestion",
            CONTROLLER_PREFIX + "foundation/controller/system/service/survey/SurveyApiController.java#insertItem",
            CONTROLLER_PREFIX + "foundation/controller/system/template/TemplateApiController.java#insertTmplatInfo",
            CONTROLLER_PREFIX + "system/DeptApiController.java#insertDept",
            CONTROLLER_PREFIX + "UserApiController.java#signup",
            CONTROLLER_PREFIX + "UserApiController.java#insertUser");

    /** 생성형 이름(create·insert·register·upload·send·signup·copy·submit)이지만 200 에 남는 POST 와 사유(양방향 exact). */
    static final Map<String, String> CREATION_NAMED_KEEP_200 = Map.of(
            CONTROLLER_PREFIX + "foundation/controller/system/MenuApiController.java#createMenuCreation",
            "권한별 메뉴 할당의 전체 교체 저장 — 새 자원이 생기지 않는다",
            CONTROLLER_PREFIX + "foundation/controller/system/service/survey/SurveySubmissionApiController.java#submit",
            "설문 응답 제출은 참여 기록(투표와 같은 행위형)이다 — 새 식별자가 없고 응답은 설문·본인으로 식별한다");

    private static final Pattern CREATION_NAME = Pattern.compile("^(?:create|insert|register|upload|send|signup|copy|submit)");

    /** 생성 census 판정에 쓰는 핸들러 사실 하나(리플렉션 + 본문 원문). */
    record CreationFacts(String key, boolean post, boolean createdStatus, boolean entityReturn,
            boolean bodyCreated, boolean bodyCreatedStatus, boolean bodySuccess) { }

    @Test
    @DisplayName("red proof: Spring Page 원형 반환을 잡는다")
    void detectsRawSpringPage() {
        assertTrue(RAW_SPRING_PAGE.matcher("ResponseEntity<ApiResponse<Page<Status>>>").find());
        assertTrue(RAW_SPRING_PAGE.matcher("ApiResponse<org.springframework.data.domain.Page<Status>>").find());
        assertTrue(!RAW_SPRING_PAGE.matcher("ResponseEntity<ApiResponse<PageResponse<Status>>>").find());
    }

    @Test
    @DisplayName("📦 목록은 PageResponse 로 감싼다 — Spring Page 원형(content·number·0 기반) 반환 금지 (헌법 제6조 4항)")
    void handlersDoNotReturnRawSpringPage() throws IOException {
        Path base = HarnessSourceIndex.repoRoot().resolve(CONTROLLER_BASE);
        List<String> raw = new ArrayList<>();
        for (Path source : HarnessSourceIndex.javaSources(base)) {
            String code = HarnessSourceIndex.stripCommentsPreservingStrings(HarnessSourceIndex.read(source));
            Matcher handler = HANDLER_MAPPING.matcher(code);
            while (handler.find()) {
                if (RAW_SPRING_PAGE.matcher(handler.group(1)).find()) {
                    raw.add(HarnessSourceIndex.repoRoot().relativize(source).toString().replace('\\', '/')
                            + "#" + handler.group(2) + " => " + handler.group(1).trim());
                }
            }
        }
        if (!raw.isEmpty()) {
            fail("Spring Page 원형 반환 " + raw.size() + "건 — PageResponse.of(page) 로 감싸 1 기반 page 와 다섯 필드를 지키십시오"
                    + "(ADR-0036, 헌법 제6조 4항).\n  · " + String.join("\n  · ", raw));
        }
    }

    @Test
    @DisplayName("red proof: 201 census 의 각 위반을 의도한 문구로 잡는다")
    void detectsCreationCensusViolations() {
        Set<String> census = Set.of("A.java#createA", "A.java#createStale");
        Map<String, String> keep = Map.of("A.java#createKept", "사유");
        List<String> violations = creationViolations(List.of(
                new CreationFacts("A.java#createA", true, true, true, false, true, true),
                new CreationFacts("A.java#createB", true, false, true, false, false, true),
                new CreationFacts("A.java#update", false, false, true, true, false, false),
                new CreationFacts("A.java#createKept", true, false, true, false, false, true)), census, keep, path -> true);
        String joined = String.join("\n", violations);
        assertTrue(joined.contains("A.java#createA — 201 핸들러가 ApiResponse.created 로 새 식별자를 싣지 않는다"), joined);
        assertTrue(joined.contains("A.java#createA — 201 핸들러가 ApiResponse.success(200 본문)를 쓴다"), joined);
        assertTrue(joined.contains("A.java#createB — 생성형 이름의 POST 가 201 census 에도 200 유지 목록에도 없다"), joined);
        assertTrue(joined.contains("A.java#update — census 밖 핸들러가 201 을 쓴다"), joined);
        assertTrue(joined.contains("201 census 의 stale 행: A.java#createStale"), joined);
        assertTrue(!joined.contains("createKept"), joined);
    }

    @Test
    @DisplayName("📦 생성 POST census — 201·ApiResponse.created 는 census 핸들러에만, 생성형 이름은 모두 분류 (ADR-0036, 헌법 제6조 5항)")
    void creationHandlersFollowCensus() throws IOException {
        List<CreationFacts> facts = creationFacts();
        if (facts.size() < ReusableHarnessProfile.current().count("responseHandlers", HANDLER_FLOOR)) {
            fail("핸들러 사실 수집 하한 미달: " + facts.size() + " — 경로·리플렉션 파손 의심. 빈 census 로 통과시키지 않습니다.");
        }
        List<String> violations = creationViolations(facts, CREATED_HANDLERS, CREATION_NAMED_KEEP_200,
                path -> ReusableHarnessProfile.current().retainsSource(path));
        if (!violations.isEmpty()) {
            fail("생성 응답 규약 이탈 " + violations.size() + "건 — 자원을 만드는 POST 는 @ResponseStatus(CREATED) 와"
                    + " ApiResponse.created(새 식별자)를 함께 쓰고 CREATED_HANDLERS 에 등재한다. 행위형 POST 는 200 이다"
                    + "(ADR-0036 분류 표).\n  · " + String.join("\n  · ", violations));
        }
    }

    @Test
    @DisplayName("red proof: 스펙의 2xx 가 census 와 어긋나면 잡는다")
    void detectsCreationSpecViolations() {
        JsonNode spec = JsonMapper.builder().configureForJackson2().build().readTree("""
                {"paths":{"/a":{"post":{"responses":{"200":{},"400":{}}},"get":{"responses":{"200":{}}}},
                          "/b":{"post":{"responses":{"201":{}}}},
                          "/c":{"delete":{"responses":{"200":{},"204":{}}}}}}
                """);
        List<String> violations = creationSpecViolations(spec, Set.of("POST /a", "POST /zzz"), true);
        String joined = String.join("\n", violations);
        assertTrue(joined.contains("POST /a — 생성 연산의 성공 응답이 [200] 이다(201 이어야 한다)"), joined);
        assertTrue(joined.contains("POST /b — census 밖 연산의 성공 응답이 [201] 이다(200 이어야 한다)"), joined);
        assertTrue(joined.contains("DELETE /c — 성공 응답이 하나가 아니다: [200, 204]"), joined);
        assertTrue(joined.contains("스펙에 없는 생성 연산: POST /zzz"), joined);
    }

    @Test
    @DisplayName("📦 스펙의 성공 응답은 연산마다 하나이고 census 연산만 201 이다 (ADR-0036)")
    void apiDocsSuccessStatusFollowsCreationCensus() throws IOException {
        JsonNode root = JsonMapper.builder().configureForJackson2().build()
                .readTree(HarnessSourceIndex.read(HarnessSourceIndex.repoRoot().resolve("api-docs.json")));
        Set<String> createdOperations = new TreeSet<>();
        for (String handler : CREATED_HANDLERS) {
            if (!ReusableHarnessProfile.current().retainsSource(handler)) continue;
            createdOperations.addAll(postOperations(handler));
        }
        List<String> violations = creationSpecViolations(root, createdOperations, true);
        if (!violations.isEmpty()) {
            fail("스펙의 성공 상태가 생성 census 와 다르다 — 생성 계약이 그대로 옮겨 프런트·외부 소비자가 다른 상태를 기대한다.\n  · "
                    + String.join("\n  · ", violations));
        }
    }

    static List<String> creationViolations(List<CreationFacts> facts, Set<String> census, Map<String, String> keep,
            java.util.function.Predicate<String> retained) {
        List<String> violations = new ArrayList<>();
        Set<String> seen = new TreeSet<>();
        for (CreationFacts fact : facts) {
            seen.add(fact.key());
            String method = fact.key().substring(fact.key().indexOf('#') + 1);
            if (census.contains(fact.key())) {
                if (!fact.post()) violations.add(fact.key() + " — 201 census 핸들러가 POST 가 아니다");
                if (!fact.createdStatus()) violations.add(fact.key() + " — 201 핸들러에 @ResponseStatus(HttpStatus.CREATED) 가 없다(스펙이 200 으로 남는다)");
                if (!fact.bodyCreated()) violations.add(fact.key() + " — 201 핸들러가 ApiResponse.created 로 새 식별자를 싣지 않는다");
                if (fact.bodySuccess()) violations.add(fact.key() + " — 201 핸들러가 ApiResponse.success(200 본문)를 쓴다");
                if (fact.entityReturn() && !fact.bodyCreatedStatus()) {
                    violations.add(fact.key() + " — ResponseEntity 를 돌려주는 201 핸들러가 ResponseEntity.status(HttpStatus.CREATED) 를 쓰지 않는다(HTTP 200·본문 201 불일치)");
                }
                continue;
            }
            if (fact.createdStatus() || fact.bodyCreated() || fact.bodyCreatedStatus()) {
                violations.add(fact.key() + " — census 밖 핸들러가 201 을 쓴다");
            }
            if (fact.post() && CREATION_NAME.matcher(method).find() && !keep.containsKey(fact.key())) {
                violations.add(fact.key() + " — 생성형 이름의 POST 가 201 census 에도 200 유지 목록에도 없다(ADR-0036 분류 기준으로 판정해 어느 한쪽에 둔다)");
            }
        }
        for (String row : census) {
            if (retained.test(row) && !seen.contains(row)) violations.add("201 census 의 stale 행: " + row);
        }
        for (String row : keep.keySet()) {
            if (retained.test(row) && !seen.contains(row)) violations.add("200 유지 목록의 stale 행: " + row);
        }
        return violations;
    }

    static List<String> creationSpecViolations(JsonNode root, Set<String> createdOperations, boolean requirePresence) {
        List<String> violations = new ArrayList<>();
        Set<String> present = new TreeSet<>();
        for (Iterator<Map.Entry<String, JsonNode>> paths = root.path("paths").properties().iterator(); paths.hasNext();) {
            Map.Entry<String, JsonNode> path = paths.next();
            for (Iterator<Map.Entry<String, JsonNode>> ops = path.getValue().properties().iterator(); ops.hasNext();) {
                Map.Entry<String, JsonNode> op = ops.next();
                String key = op.getKey().toUpperCase(Locale.ROOT) + " " + path.getKey();
                present.add(key);
                List<String> success = new ArrayList<>();
                op.getValue().path("responses").propertyNames().forEach(code -> {
                    if (code.startsWith("2")) success.add(code);
                });
                if (success.size() != 1) {
                    violations.add(key + " — 성공 응답이 하나가 아니다: " + success);
                    continue;
                }
                boolean created = createdOperations.contains(key);
                if (created && !success.equals(List.of("201"))) {
                    violations.add(key + " — 생성 연산의 성공 응답이 " + success + " 이다(201 이어야 한다)");
                } else if (!created && !success.equals(List.of("200"))) {
                    violations.add(key + " — census 밖 연산의 성공 응답이 " + success + " 이다(200 이어야 한다)");
                }
            }
        }
        if (requirePresence) {
            for (String created : createdOperations) {
                if (!present.contains(created)) violations.add("스펙에 없는 생성 연산: " + created);
            }
        }
        return violations;
    }

    /** 컨트롤러 소스마다 리플렉션(매핑·@ResponseStatus·반환형)과 본문 원문을 합친 사실. */
    private static List<CreationFacts> creationFacts() throws IOException {
        Path repoRoot = HarnessSourceIndex.repoRoot();
        List<CreationFacts> facts = new ArrayList<>();
        for (Path source : HarnessSourceIndex.javaSources(repoRoot.resolve(CONTROLLER_BASE))) {
            String relative = repoRoot.relativize(source).toString().replace('\\', '/');
            String code = HarnessSourceIndex.stripCommentsPreservingStrings(HarnessSourceIndex.read(source));
            for (java.lang.reflect.Method method : controllerClass(relative).getDeclaredMethods()) {
                if (method.isSynthetic() || method.isBridge()
                        || AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class) == null) {
                    continue;
                }
                RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
                ResponseStatus status = AnnotatedElementUtils.findMergedAnnotation(method, ResponseStatus.class);
                String body = methodBody(code, method.getName());
                facts.add(new CreationFacts(relative + "#" + method.getName(),
                        Arrays.asList(mapping.method()).contains(RequestMethod.POST),
                        status != null && status.code() == HttpStatus.CREATED,
                        org.springframework.http.ResponseEntity.class.isAssignableFrom(method.getReturnType()),
                        body.contains("ApiResponse.created("),
                        body.contains("HttpStatus.CREATED"),
                        body.contains("ApiResponse.success(")));
            }
        }
        return facts;
    }

    /** census 핸들러 하나의 "POST 경로" 들 — 클래스 경로 × 메서드 경로. */
    private static Set<String> postOperations(String handler) {
        String relative = handler.substring(0, handler.indexOf('#'));
        String name = handler.substring(handler.indexOf('#') + 1);
        Class<?> type = controllerClass(relative);
        RequestMapping classMapping = AnnotatedElementUtils.findMergedAnnotation(type, RequestMapping.class);
        List<String> prefixes = classMapping == null || classMapping.path().length == 0
                ? List.of("") : Arrays.asList(classMapping.path());
        Set<String> operations = new TreeSet<>();
        for (java.lang.reflect.Method method : type.getDeclaredMethods()) {
            PostMapping post = AnnotatedElementUtils.findMergedAnnotation(method, PostMapping.class);
            if (post == null || !method.getName().equals(name)) continue;
            List<String> suffixes = post.path().length == 0 ? List.of("") : Arrays.asList(post.path());
            for (String prefix : prefixes) {
                for (String suffix : suffixes) {
                    String joined = (prefix + (suffix.isEmpty() || suffix.startsWith("/") ? suffix : "/" + suffix))
                            .replaceAll("/+$", "");
                    operations.add("POST " + joined);
                }
            }
        }
        if (operations.isEmpty()) fail("census 핸들러의 POST 매핑을 찾지 못했다: " + handler);
        return operations;
    }

    private static Class<?> controllerClass(String relative) {
        String fqn = relative.substring("api-server/src/main/java/".length(), relative.length() - ".java".length())
                .replace('/', '.');
        try {
            return Class.forName(fqn, false, ResponseContractLinterTest.class.getClassLoader());
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("컨트롤러 컴파일 클래스를 찾지 못했다(조용한 skip 금지): " + fqn, e);
        }
    }

    /** 메서드 본문 원문(같은 이름의 오버로드가 있으면 모두 이어 붙인다). 선언을 못 찾으면 빈 문자열. */
    private static String methodBody(String code, String name) {
        StringBuilder bodies = new StringBuilder();
        Matcher declaration = Pattern.compile("\\bpublic\\s+[^;{=()]+?\\s" + name + "\\s*\\(").matcher(code);
        while (declaration.find()) {
            int depth = 1;
            int i = declaration.end();
            for (; i < code.length() && depth > 0; i++) {
                char c = code.charAt(i);
                if (c == '(') depth++;
                else if (c == ')') depth--;
            }
            int open = code.indexOf('{', i);
            int braces = 0;
            for (int j = open; j < code.length(); j++) {
                char c = code.charAt(j);
                if (c == '{') braces++;
                else if (c == '}' && --braces == 0) {
                    bodies.append(code, open, j + 1);
                    break;
                }
            }
        }
        return bodies.toString();
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
