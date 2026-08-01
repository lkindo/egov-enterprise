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
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🛡️ 배포 형상 안전성 린터 — "운영 배포가 조용히 개발 기본값으로 굳는 것" 을 차단한다.
 *
 * <p>[근거] 2026-08-01 Wave 0 감사에서 <b>잘 작성된 {@code application-prod.yml} 을 배포 경로가 한 번도
 * 쓰지 않는다</b>는 것이 저장소 최대 단일 위험으로 판정됐다. {@code docker-compose.yml} 에
 * {@code SPRING_PROFILES_ACTIVE} 주입 지점이 아예 없어 컨테이너가 항상 base 프로파일로 기동했고, 그 결과
 * ① 약한 dev 기본값(JWT_SECRET·algorithmKey)이 그대로 살아 있었고 ② base actuator 가 {@code env,beans} 를
 * 노출하며 {@code health.show-details: always} 였다(=/actuator/health 는 whitelist 라 <b>미인증 접근 가능</b>).
 * 같은 감사에서 {@code application-prod.yml} 에 {@code jdbc-url} 이 없어 <b>prod 프로파일은 애초에 기동조차
 * 불가능</b>했다는 사실도 실측됐다. 이 게이트는 그 4건의 봉합을 기계로 못박는다.
 *
 * <p>[규칙] 아래 중 하나라도 어기면 위반이다.
 * <ol>
 *   <li>base {@code application.yml} 의 {@code management.endpoints.web.exposure.include} 에
 *       {@code env}/{@code beans}/{@code *} 가 있으면 위반(자격증명·마스터키 노출면).</li>
 *   <li>base {@code application.yml} 의 {@code management.endpoint.health.show-details} 가
 *       {@code always} 면 위반(익명 접근 경로에서 컴포넌트 상세 노출). prod yml 은 재선언한 경우에만 동일 검사.</li>
 *   <li>base {@code docker-compose.yml} 이 {@code SPRING_PROFILES_ACTIVE} 주입 지점을 잃거나 특정 프로파일로
 *       하드코딩되면 위반(주입 지점 소멸 = 회귀 원복, 하드코딩 = CI e2e·ZAP·로컬 개발 전멸).</li>
 *   <li>{@code docker-compose.prod.yml} 이 없거나 {@code SPRING_PROFILES_ACTIVE: prod} 를 지정하지 않으면 위반.</li>
 *   <li>{@code docker-compose.prod.yml} 이 {@code SPRING_APPLICATION_JSON} 을 재정의하지 않으면 위반 —
 *       base 의 JSON 이 datasource 를 개발 DB 로 못 박고 있고 SAJ 는 OS 환경변수·prod yml 보다 <b>상위</b>라,
 *       교체하지 않으면 운영 DB 설정이 조용히 무시된다.</li>
 *   <li>{@code application.yml}/{@code application-prod.yml} 의 {@code spring.datasource} 에 {@code jdbc-url}
 *       키가 없으면 위반(기동 차단 결함).</li>
 *   <li>base {@code application.yml} 에 flat {@code spring.datasource.connection-timeout} 이 없거나 상한
 *       ({@value #MAX_CONNECTION_TIMEOUT_MS}ms)을 넘으면 위반.</li>
 * </ol>
 *
 * <p><b>수량 하한 동결은 의도적으로 만들지 않는다</b> — 풀 크기 등 "N 이상" 동결은 항목 교체로 우회되고
 * 정당한 부채 상환까지 막는 안티패턴으로 기각됐다(§0.7-H2). 여기서 다루는 수치는 <b>상한</b>(timeout)뿐이다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 텍스트 스캔. 경로 해석은 IdentityAxisLinterTest 의
 * {@code resolveRepoRoot()}(settings.gradle 탐색) 관행을 재사용한다.
 */
class ConfigSafetyLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ConfigSafetyLinterTest.class);

    // ---- 감사 대상 4파일 (하나라도 없으면 게이트 파손 → 즉시 실패) ----------------------
    private static final String COMPOSE_BASE = "docker-compose.yml";
    private static final String COMPOSE_PROD = "docker-compose.prod.yml";
    private static final String APP_YML = "api-server/src/main/resources/application.yml";
    private static final String APP_PROD_YML = "api-server/src/main/resources/application-prod.yml";

    // ---- 판정 키 ---------------------------------------------------------------------
    private static final String KEY_EXPOSURE_INCLUDE = "management.endpoints.web.exposure.include";
    private static final String KEY_SHOW_DETAILS = "management.endpoint.health.show-details";
    private static final String KEY_JDBC_URL = "spring.datasource.jdbc-url";
    private static final String KEY_CONNECTION_TIMEOUT = "spring.datasource.connection-timeout";

    /** actuator 기본 노출에서 영구 배제할 엔드포인트 — env=환경변수 전량(DB 자격증명·ALGORITHM_KEY), beans=빈 그래프. */
    private static final Set<String> FORBIDDEN_ACTUATOR_ENDPOINTS = Set.of("env", "beans", "configprops", "*");

    /** 커넥션 획득 대기 상한(ms). 상한만 검사한다 — 하한 동결은 §0.7-H2 로 기각된 안티패턴. */
    private static final long MAX_CONNECTION_TIMEOUT_MS = 10_000L;

    // ---- 파싱 정규식 -----------------------------------------------------------------
    /** YAML 매핑 한 줄: 들여쓰기 + 키 + 값. 시퀀스({@code - item})·연속행은 매칭되지 않는다. */
    private static final Pattern YAML_KEY = Pattern.compile("^(\\s*)([A-Za-z0-9_.\\-]+)\\s*:(.*)$");

    /** compose 의 환경변수 라인(주석 제거 후 매칭하므로 문서 본문 언급은 잡히지 않는다). */
    private static final Pattern COMPOSE_PROFILES_ACTIVE =
            Pattern.compile("(?m)^\\s*SPRING_PROFILES_ACTIVE\\s*:(.*)$");
    private static final Pattern COMPOSE_APPLICATION_JSON =
            Pattern.compile("(?m)^\\s*SPRING_APPLICATION_JSON\\s*:(.*)$");

    /** vacuity 방지: compose 파일이 실제로 api 서비스를 정의하고 있는지(구조가 통째로 바뀌면 위 매칭이 무의미). */
    private static final Pattern COMPOSE_API_SERVICE = Pattern.compile("(?m)^\\s+api\\s*:\\s*$");

    /** {@code ${VAR:default}} 형태에서 default 를 뽑는다(placeholder 를 숫자 파싱 실패로 오판하지 않기 위함). */
    private static final Pattern PLACEHOLDER_DEFAULT = Pattern.compile("^\\$\\{[^:}]*:([^}]*)}$");

    @Test
    @DisplayName("🛡️ 배포 형상 안전성 — prod 오버레이 존재·actuator 노출면·prod 기동가능성 회귀 차단 (Wave 0)")
    void auditDeploymentConfigSafety() throws IOException {
        Path root = resolveRepoRoot();

        // ── vacuity ①: 감사 대상 4파일 전부 존재해야 한다. 하나라도 없으면 조용한 통과가 아니라 실패.
        Path composeBase = requireFile(root, COMPOSE_BASE);
        Path composeProd = requireFile(root, COMPOSE_PROD);
        Path appYml = requireFile(root, APP_YML);
        Path appProdYml = requireFile(root, APP_PROD_YML);

        Map<String, String> base = flattenYaml(appYml);
        Map<String, String> prod = flattenYaml(appProdYml);
        String composeBaseSrc = stripComments(Files.readString(composeBase, StandardCharsets.UTF_8));
        String composeProdSrc = stripComments(Files.readString(composeProd, StandardCharsets.UTF_8));

        // ── vacuity ②: 파싱이 조용히 붕괴하면 아래 검사가 전부 vacuous 통과가 된다.
        //    실측(2026-08-01): application.yml 147 키 / application-prod.yml 62 키.
        if (base.size() < 80 || prod.size() < 30) {
            fail("게이트 무결성 파손: YAML 파싱 결과가 하한 미만입니다 (application.yml=" + base.size()
                    + "/80, application-prod.yml=" + prod.size() + "/30) — 파일 구조·파서 파손 의심 (workingDir="
                    + Paths.get("").toAbsolutePath() + ").");
        }
        if (!COMPOSE_API_SERVICE.matcher(composeBaseSrc).find()
                || !COMPOSE_API_SERVICE.matcher(composeProdSrc).find()) {
            fail("게이트 무결성 파손: compose 파일에서 'api' 서비스 정의를 찾지 못했습니다 — 서비스명 변경/구조 개편 시"
                    + " 이 린터의 환경변수 검사가 통째로 vacuous 해집니다. 린터를 함께 갱신하십시오.");
        }

        List<String> violations = new ArrayList<>();

        // ── 1·2) actuator 노출면 (base 는 필수 선언, prod 는 재선언한 경우에만 값 검사)
        auditActuatorExposure("application.yml", base, true, violations);
        auditActuatorExposure("application-prod.yml", prod, false, violations);

        // ── 3) base compose: 프로파일 주입 지점 존재 + 하드코딩 금지
        auditBaseProfileInjection(composeBaseSrc, violations);

        // ── 4·5) prod 오버레이: 프로파일 prod 고정 + SPRING_APPLICATION_JSON 재정의
        auditProdOverlay(composeProdSrc, violations);

        // ── 6) datasource jdbc-url (LegacyConfig 바인딩 제약 — 없으면 기동 불가)
        auditJdbcUrl("application.yml", base, violations);
        auditJdbcUrl("application-prod.yml", prod, violations);

        // ── 7) flat connection-timeout 상한
        auditConnectionTimeout(base, violations);

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🛡️ [CONFIG SAFETY LINTER] 배포 형상 회귀가 감지되었습니다! (Wave 0 봉합 원복)\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 이 게이트가 지키는 것: 운영 배포가 개발 기본값(약한 시크릿·넓은 actuator 노출면·개발 DB)으로\n");
            sb.append("   조용히 굳는 경로. 설정을 되돌리기 전에 'prod 프로파일이 실제로 적용되는가' 를 먼저 자문하십시오.\n");
            sb.append("   참조: docker-compose.prod.yml 머리주석 · application-prod.yml 의 jdbc-url 주석.\n");
            fail(sb.toString());
        }

        log.info("✅ 배포 형상 안전성 OK — prod 오버레이 존재(프로파일 prod + SAJ 재정의), actuator 노출면 {}종 배제, "
                        + "jdbc-url 양쪽 선언, connection-timeout ≤ {}ms.",
                FORBIDDEN_ACTUATOR_ENDPOINTS.size(), MAX_CONNECTION_TIMEOUT_MS);
    }

    // ---- 개별 검사 -------------------------------------------------------------------

    /**
     * actuator 노출면. include 는 CSV 인라인 형식만 판정 가능하므로, 블록/리스트 형식으로 바뀌면
     * "판정 불가" 를 통과가 아니라 <b>위반</b>으로 처리한다(판정 불가를 그린으로 넘기면 게이트가 무의미해진다).
     */
    private void auditActuatorExposure(String label, Map<String, String> yaml, boolean required,
                                       List<String> violations) {
        String include = yaml.get(KEY_EXPOSURE_INCLUDE);
        if (include == null) {
            if (required) {
                violations.add(label + ": " + KEY_EXPOSURE_INCLUDE + " 키가 사라졌습니다 — 명시적 노출 허용목록이"
                        + " 없으면 노출면이 프레임워크 기본값에 맡겨집니다. 'health,info,metrics,prometheus' 형태로 복구하십시오.");
            }
        } else if (unquote(include).isEmpty()) {
            violations.add(label + ": " + KEY_EXPOSURE_INCLUDE + " 가 인라인 CSV 가 아닙니다(블록/리스트 형식)."
                    + " 이 게이트는 CSV 만 판정할 수 있으므로 판정 불가를 위반으로 처리합니다 — CSV 로 유지하십시오.");
        } else {
            for (String token : unquote(include).split(",")) {
                String t = token.trim().toLowerCase();
                if (!t.isEmpty() && FORBIDDEN_ACTUATOR_ENDPOINTS.contains(t)) {
                    violations.add(label + ": " + KEY_EXPOSURE_INCLUDE + " 에 '" + t + "' 가 포함되어 있습니다 —"
                            + " /actuator/env 는 DB 자격증명·ALGORITHM_KEY(PII 마스터키)를 그대로 덤프합니다."
                            + " 인가 실수 한 겹이면 전면 노출이므로 기본 노출면에서 제외하십시오.");
                }
            }
        }

        String showDetails = yaml.get(KEY_SHOW_DETAILS);
        if (showDetails == null) {
            if (required) {
                violations.add(label + ": " + KEY_SHOW_DETAILS + " 키가 사라졌습니다 —"
                        + " 'when_authorized' 로 명시하십시오(부재 시 의도가 소실됩니다).");
            }
        } else if ("always".equalsIgnoreCase(unquote(showDetails))) {
            violations.add(label + ": " + KEY_SHOW_DETAILS + " = always 입니다 — /actuator/health 는"
                    + " security.whitelist 에 있어 **미인증 접근이 허용**되므로 익명 사용자가 DB·디스크 컴포넌트"
                    + " 상세를 읽게 됩니다. 'when_authorized' 를 쓰십시오(컨테이너 healthcheck·CI 대기는 상태코드만 봅니다).");
        }
    }

    /**
     * base compose 는 <b>주입 지점만</b> 있어야 한다. 여기에 특정 프로파일을 하드코딩하면
     * CI e2e·ZAP 스캔·로컬 개발이 같은 스택을 쓰므로 전부 깨진다(prod 하드코딩 시 ALGORITHM_KEY
     * 무기본값 fail-fast 로 기동 불가, cookie.secure=true 로 http localhost 로그인 전멸).
     */
    private void auditBaseProfileInjection(String composeBaseSrc, List<String> violations) {
        Matcher m = COMPOSE_PROFILES_ACTIVE.matcher(composeBaseSrc);
        if (!m.find()) {
            violations.add(COMPOSE_BASE + ": SPRING_PROFILES_ACTIVE 주입 지점이 없습니다 — 이것이 없으면"
                    + " 컨테이너는 무슨 짓을 해도 base 프로파일로만 기동하고 application-prod.yml 은 사문(死文)이 됩니다."
                    + " `SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-}` 를 api 서비스 environment 에 복구하십시오.");
            return;
        }
        String value = unquote(m.group(1).trim());
        if (!value.contains("${")) {
            violations.add(COMPOSE_BASE + ": SPRING_PROFILES_ACTIVE 가 '" + value + "' 로 하드코딩되었습니다 —"
                    + " 이 compose 는 CI e2e·주간 ZAP 스캔·로컬 개발이 공유하는 개발 스택입니다."
                    + " 기본값은 파라미터화(${SPRING_PROFILES_ACTIVE:-})로 두고 운영 형상은 " + COMPOSE_PROD + " 오버레이로 주입하십시오.");
        }
    }

    /** 운영 오버레이의 두 필수 조건: 프로파일 prod 고정 + base 의 datasource 고정 JSON 무력화. */
    private void auditProdOverlay(String composeProdSrc, List<String> violations) {
        Matcher profile = COMPOSE_PROFILES_ACTIVE.matcher(composeProdSrc);
        if (!profile.find()) {
            violations.add(COMPOSE_PROD + ": SPRING_PROFILES_ACTIVE 선언이 없습니다 — 오버레이의 존재 이유"
                    + "(prod 프로파일 활성화) 자체가 소멸했습니다.");
        } else {
            boolean hasProd = false;
            for (String token : unquote(profile.group(1).trim()).split(",")) {
                if ("prod".equals(token.trim())) {
                    hasProd = true;
                }
            }
            if (!hasProd) {
                violations.add(COMPOSE_PROD + ": SPRING_PROFILES_ACTIVE = '" + unquote(profile.group(1).trim())
                        + "' — 'prod' 가 활성 프로파일 목록에 없습니다. 이 오버레이로 배포해도"
                        + " application-prod.yml(무기본값 fail-fast·actuator 축소·쿠키 secure·swagger off)이 적용되지 않습니다.");
            }
        }

        Matcher saj = COMPOSE_APPLICATION_JSON.matcher(composeProdSrc);
        if (!saj.find()) {
            violations.add(COMPOSE_PROD + ": SPRING_APPLICATION_JSON 재정의가 없습니다 —"
                    + " Spring 외부화 설정 우선순위상 SPRING_APPLICATION_JSON 은 OS 환경변수와 application-prod.yml"
                    + " 보다 **상위**입니다. base compose 의 JSON 이 datasource 를 db:5432/egov/egov123 으로 못 박고"
                    + " 있으므로, 이 키를 통째로 교체하지 않으면 DB_URL 을 주입해도 조용히 무시된 채 개발 DB 에 붙습니다.");
        } else if (unquote(saj.group(1).trim()).isEmpty()) {
            violations.add(COMPOSE_PROD + ": SPRING_APPLICATION_JSON 의 값이 비어 있습니다 —"
                    + " compose 에서 값 없는 환경변수 키는 '호스트 환경변수 통과'를 의미하므로 base 의 datasource"
                    + " 고정 JSON 을 확실히 무력화하지 못합니다. 명시적 JSON 문자열로 교체하십시오.");
        }
    }

    /**
     * {@code spring.datasource.jdbc-url} 부재는 스타일 문제가 아니라 <b>기동 차단 결함</b>이다.
     * LegacyConfig.dataSource() 가 @Primary + @ConfigurationProperties("spring.datasource") 로
     * HikariDataSource 에 직접 바인딩하는데 HikariConfig 에는 setUrl() 이 없다 → {@code url} 은 바인딩되지 않고
     * jdbcUrl 이 null 인 채 driverClassName 만 세팅되어 HikariConfig.validate() 가
     * "jdbcUrl is required with driverClassName." 로 실패한다.
     */
    private void auditJdbcUrl(String label, Map<String, String> yaml, List<String> violations) {
        String jdbcUrl = yaml.get(KEY_JDBC_URL);
        if (jdbcUrl == null || unquote(jdbcUrl).isEmpty()) {
            violations.add(label + ": " + KEY_JDBC_URL + " 키가 없습니다 — 이것은 스타일이 아니라 **기동 차단**입니다."
                    + " LegacyConfig.dataSource() 가 @Primary + @ConfigurationProperties(\"spring.datasource\") 로"
                    + " HikariDataSource 에 직접 바인딩하는데 HikariConfig 에는 setUrl() 이 없어, `url` 만 두면"
                    + " jdbcUrl 이 null 인 채 driverClassName 만 세팅되고 HikariConfig.validate() 가"
                    + " \"jdbcUrl is required with driverClassName.\" 로 죽습니다. url 과 함께 jdbc-url 을 선언하십시오.");
        }
    }

    /** flat 키만 실효를 가진다(nested spring.datasource.hikari.* 는 LegacyConfig 바인딩상 조용히 무시됨). */
    private void auditConnectionTimeout(Map<String, String> base, List<String> violations) {
        String raw = base.get(KEY_CONNECTION_TIMEOUT);
        if (raw == null || unquote(raw).isEmpty()) {
            violations.add("application.yml: flat " + KEY_CONNECTION_TIMEOUT + " 키가 사라졌습니다 —"
                    + " nested spring.datasource.hikari.* 는 LegacyConfig 바인딩상 런타임에 적용되지 않으므로,"
                    + " 이 키가 없으면 실효값이 Hikari 기본 30초로 되돌아가고 커넥션 고갈이 대량 500 으로 표출됩니다.");
            return;
        }
        Long ms = parseMillis(unquote(raw));
        if (ms == null) {
            violations.add("application.yml: " + KEY_CONNECTION_TIMEOUT + " 값 '" + unquote(raw)
                    + "' 을 밀리초 정수로 해석할 수 없습니다 — HikariConfig.setConnectionTimeout(long) 은 ms 정수만"
                    + " 바인딩합니다. 숫자 또는 ${VAR:숫자} 형태로 두십시오(판정 불가는 통과가 아니라 위반입니다).");
        } else if (ms > MAX_CONNECTION_TIMEOUT_MS) {
            violations.add("application.yml: " + KEY_CONNECTION_TIMEOUT + " = " + ms + "ms 로 상한("
                    + MAX_CONNECTION_TIMEOUT_MS + "ms)을 초과합니다 — 커넥션 획득을 오래 붙들면 요청 스레드가 함께"
                    + " 묶여 장애가 전파됩니다. 상한을 늘려야 한다면 그 근거를 기록하고 값이 아니라 이 게이트를 함께 논의하십시오.");
        }
    }

    // ---- 파싱 유틸 -------------------------------------------------------------------

    /**
     * YAML 을 {@code a.b.c -> value} 평면 맵으로 접는다. 들여쓰기 스택으로 문맥을 추적하므로
     * {@code spring.datasource.connection-timeout}(flat) 과 {@code spring.datasource.hikari.connection-timeout}
     * (nested) 을 혼동하지 않는다 — 정규식만으로 키를 찾으면 이 둘을 구분하지 못해 오탐이 난다.
     */
    private static Map<String, String> flattenYaml(Path file) throws IOException {
        Map<String, String> result = new LinkedHashMap<>();
        List<String> keyStack = new ArrayList<>();
        List<Integer> indentStack = new ArrayList<>();

        for (String rawLine : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            String line = stripInlineComment(rawLine);
            if (line.isBlank()) {
                continue;
            }
            Matcher m = YAML_KEY.matcher(line);
            if (!m.matches()) {
                continue; // 시퀀스 항목·블록 스칼라 연속행 등 — 키 라인이 아니다
            }
            int indent = m.group(1).length();
            while (!indentStack.isEmpty() && indentStack.get(indentStack.size() - 1) >= indent) {
                indentStack.remove(indentStack.size() - 1);
                keyStack.remove(keyStack.size() - 1);
            }
            indentStack.add(indent);
            keyStack.add(m.group(2));
            result.put(String.join(".", keyStack), m.group(3).trim());
        }
        return result;
    }

    /** 라인 단위 주석 제거(따옴표 안의 '#' 은 보존). 오탐 = 거짓 red = 게이트 신뢰 붕괴이므로 상태 기계로 처리한다. */
    private static String stripComments(String src) {
        StringBuilder out = new StringBuilder(src.length());
        String[] lines = src.split("\r?\n", -1);
        for (int i = 0; i < lines.length; i++) {
            if (i > 0) {
                out.append('\n');
            }
            out.append(stripInlineComment(lines[i]));
        }
        return out.toString();
    }

    /** 따옴표 밖에 있고 줄 시작이거나 공백에 뒤따르는 첫 '#' 이후를 잘라낸다(YAML 주석 규칙). */
    private static String stripInlineComment(String line) {
        char quote = 0;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (quote != 0) {
                if (c == quote) {
                    quote = 0;
                }
                continue;
            }
            if (c == '"' || c == '\'') {
                quote = c;
                continue;
            }
            if (c == '#' && (i == 0 || Character.isWhitespace(line.charAt(i - 1)))) {
                return line.substring(0, i);
            }
        }
        return line;
    }

    /** 감싼 따옴표 1겹 제거 + 트림. */
    private static String unquote(String value) {
        String v = value.trim();
        if (v.length() >= 2
                && ((v.charAt(0) == '"' && v.charAt(v.length() - 1) == '"')
                || (v.charAt(0) == '\'' && v.charAt(v.length() - 1) == '\''))) {
            return v.substring(1, v.length() - 1).trim();
        }
        return v;
    }

    /** 숫자 또는 {@code ${VAR:숫자}} 를 ms 로 해석. 해석 불가면 null(호출부가 위반으로 처리). */
    private static Long parseMillis(String value) {
        String v = value.trim();
        Matcher placeholder = PLACEHOLDER_DEFAULT.matcher(v);
        if (placeholder.matches()) {
            v = placeholder.group(1).trim();
        }
        if (!v.matches("\\d+")) {
            return null;
        }
        try {
            return Long.valueOf(v);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // ---- 경로 해석 -------------------------------------------------------------------

    /** 감사 대상 파일 존재를 강제한다 — 파일 부재를 조용히 skip 하면 그 자체가 false-green 이다. */
    private static Path requireFile(Path root, String repoRelative) {
        Path p = root.resolve(repoRelative);
        if (!Files.isRegularFile(p)) {
            fail("게이트 무결성 파손: 감사 대상 파일이 없습니다 — " + repoRelative + " (해석경로=" + p.toAbsolutePath()
                    + "). 이 파일의 소멸은 그 자체가 Wave 0 봉합의 원복입니다(특히 " + COMPOSE_PROD
                    + " 가 없으면 운영 배포는 개발 기본값으로 기동합니다).");
        }
        return p;
    }

    /** cwd 또는 상위에서 settings.gradle 을 가진 저장소 루트를 찾는다(IdentityAxisLinterTest 경로해석 관행). */
    private static Path resolveRepoRoot() {
        Path cur = Paths.get("").toAbsolutePath();
        for (int i = 0; i < 4 && cur != null; i++) {
            if (Files.exists(cur.resolve("settings.gradle")) || Files.exists(cur.resolve("settings.gradle.kts"))) {
                return cur;
            }
            cur = cur.getParent();
        }
        fail("게이트 무결성 파손: settings.gradle 로 저장소 루트를 찾지 못함(cwd="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green → 실패 처리.");
        return Paths.get(""); // unreachable
    }
}
