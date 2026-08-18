package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * 🔐 시크릿 리터럴 재유입 차단 게이트 — 배포 스크립트·운영 설정의 "조용한 dev 키 주입" 회귀 방지.
 *
 * <p>[근거] 2026-08-01 Wave 0 에서 {@code scripts/deploy.sh} 가 다음 형태였다.
 * <pre>
 *   if [ -z "$JWT_SECRET" ]; then
 *       echo "Warning: JWT_SECRET is not set. Using default secret for development."
 *       export JWT_SECRET="dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci1lZ292Li4u"
 *   fi
 * </pre>
 * 즉 <b>운영 배포 스크립트가 저장소에 커밋된 dev 서명 키를 경고 한 줄만 남기고 그대로 주입</b>하고 있었다.
 * 공개 저장소의 서명 키로 운영 토큰이 서명되면 임의 esntlId 를 subject 로 하는 액세스 토큰을 누구나
 * 위조할 수 있다. 이를 fail-fast(필수 시크릿 미설정 시 {@code exit 1})로 교체하고, 운영 오버레이
 * {@code docker-compose.prod.yml} 은 {@code ${NAME:?...}} 필수 형태로, {@code application-prod.yml} 은
 * 무기본값 {@code ${NAME}} 으로 정리했다. 이 게이트는 그 봉합을 기계로 못박는다.
 *
 * <p>[규칙] 두 가지만, 확실하게 판정한다(부분집합 fail-safe — 오탐이 지배하는 게이트는 SKIP_HARNESS 를
 * 정당화해 하네스 전체의 실행률을 떨어뜨린다).
 * <ol>
 *   <li><b>배포 스크립트 인라인 대입</b> — {@code scripts/} 하위 {@code .sh}/{@code .ps1} 에서 시크릿
 *       환경변수에 <b>리터럴 값</b>을 대입하는 것(셸 {@code export NAME="…"}, 파워셸
 *       {@code $env:NAME = "…"} / {@code [Environment]::SetEnvironmentVariable("NAME","…")}) 과,
 *       {@code ${NAME:-기본값}}·{@code ${NAME:=기본값}} 형태의 <b>조용한 기본값 대체</b>.
 *       변수 참조({@code $VAR}·{@code ${VAR}}·{@code $(cmd)})만으로 이루어진 대입과 빈 값 대입은 위반이 아니다.</li>
 *   <li><b>운영 설정의 기본값 부착</b> — {@code application-prod.yml} 의 시크릿 플레이스홀더에 기본값이
 *       붙는 것({@code ${JWT_SECRET:…}})과, 시크릿 키의 값이 무기본값 플레이스홀더가 아닌 것
 *       (리터럴 인라인). {@code docker-compose.prod.yml} 은 POSIX 치환 규약이므로 {@code :-}/{@code :=}
 *       기본값만 위반이고 {@code :?}(미설정 시 오류)는 정상이다.</li>
 * </ol>
 * <b>base/dev/test 프로파일의 개발 기본값은 검사 대상이 아니다</b> — {@code application.yml} 의
 * {@code ${JWT_SECRET:dGhpcy…}}·{@code ${ALGORITHM_KEY:egovframe}} 는 로컬 개발과 CI E2E 의 기본 경로가
 * 의존하는 <b>의도된</b> 값이다. 단, 외부 시스템에 연결할 수 있는 {@code application-e2e.yml} 의 DB 접속
 * 정보는 무기본값 환경변수만 허용한다. 테스트 프로파일이라는 이름이 운영 데이터 접근의 면허가 될 수 없다.
 * 하드코딩 base64/bcrypt "처럼 보이는" 긴 문자열의 일반 탐지는 오탐이 지배하므로 넣지 않는다.
 *
 * <p>[gitleaks 와의 관계 — 중복이 아니다] pre-commit 훅의 gitleaks 는 (a) {@code command -v gitleaks} 조건부라
 * 미설치 환경에서 <b>조용히 no-op</b> 이고, (b) {@code --staged} 스캔이라 <b>이미 커밋된</b> 리터럴은 보지 않으며,
 * (c) 엔트로피 기반이라 {@code egov123} 같은 저엔트로피 값이나 {@code ${NAME:-dev}} 기본값 구조는 잡지 못한다.
 * 이 게이트는 pre-push 에서 항상 실행되는 {@code :api-server:harnessTest} 에 실려 저장소 <b>현재 상태</b>를
 * 구조적으로 판정한다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 텍스트 스캔.
 */
class SecretLiteralLinterTest {

    private static final Logger log = LoggerFactory.getLogger(SecretLiteralLinterTest.class);

    /**
     * 배포 시크릿으로 취급하는 환경변수 이름. <b>포함(inclusion) 목록이며 예외·제외 목록이 아니다</b> —
     * 여기서 이름을 <b>빼는</b> 것이 곧 보호 해제이므로 축소 시 사유를 커밋 기록에 남긴다(AGENTS.md Evidence guardrails H2).
     */
    private static final Set<String> SECRET_ENV_NAMES = new TreeSet<>(List.of(
            "ADMIN_INITIAL_PASSWORD",
            "ALGORITHM_KEY",
            "OLD_ALGORITHM_KEY",
            "DB_PASSWORD",
            "DOCKERHUB_TOKEN",
            "DOCKER_PASSWORD",
            "GH_TOKEN",
            "GITHUB_TOKEN",
            "JWT_SECRET",
            "MAIL_PASSWORD",
            "POSTGRES_PASSWORD",
            "SMS_API_KEY",
            "SSH_PRIVATE_KEY"));

    /** 정규식 조립용 이름 교대(alternation). */
    private static final String NAME_ALT = String.join("|", SECRET_ENV_NAMES);

    /** 스캔 대상 경로 — 배포 스크립트, 에이전트 DB 도구와 운영 형상 파일 2종. */
    private static final String SCRIPTS_DIR = "scripts";
    private static final String AGENT_SCRIPTS_DIR = ".agent/scripts";
    private static final String APP_PROD_YML = "api-server/src/main/resources/application-prod.yml";
    private static final String APP_E2E_YML = "api-server/src/main/resources/application-e2e.yml";
    private static final String APP_LOCAL_YML = "api-server/src/main/resources/application-local.yml";
    private static final String COMPOSE_PROD_YML = "docker-compose.prod.yml";

    private static final Set<String> SCRIPT_EXTENSIONS = new TreeSet<>(List.of(".ps1", ".sh"));

    /** 셸 대입: {@code export NAME=…} / {@code NAME=…}. {@code $NAME =}(비교)와 {@code ==} 는 제외. */
    private static final Pattern SHELL_ASSIGN =
            Pattern.compile("(?<![A-Za-z0-9_$])(" + NAME_ALT + ")\\s*=(?!=)");

    /** 파워셸 환경변수 대입: {@code $env:NAME = …}. */
    private static final Pattern PS_ENV_ASSIGN =
            Pattern.compile("\\$env:(" + NAME_ALT + ")\\s*=(?!=)");

    /** 파워셸 API 형태 대입: {@code [Environment]::SetEnvironmentVariable("NAME", "리터럴")}. */
    private static final Pattern PS_SET_ENV_LITERAL = Pattern.compile(
            "SetEnvironmentVariable\\s*\\(\\s*[\"'](" + NAME_ALT + ")[\"']\\s*,\\s*[\"']([^\"']*)[\"']");

    /** POSIX 기본값 치환 {@code ${NAME:-기본값}} / {@code ${NAME:=기본값}} — {@code :?} 는 정상(필수 강제). */
    private static final Pattern POSIX_DEFAULT_SUBSTITUTION =
            Pattern.compile("\\$\\{(" + NAME_ALT + ")\\s*:[-=]([^}]*)\\}");

    /** Spring 플레이스홀더 기본값 {@code ${NAME:기본값}} — 운영에서는 어떤 기본값도 fail-fast 를 무너뜨린다. */
    private static final Pattern SPRING_PLACEHOLDER_DEFAULT =
            Pattern.compile("\\$\\{(" + NAME_ALT + ")\\s*:([^}]*)\\}");

    /** application-prod.yml 의 시크릿 보유 키 라인. */
    private static final Pattern SECRET_YAML_KEY_LINE =
            Pattern.compile("^\\s*(secret|password|algorithmKey|algorithm-key)\\s*:\\s*(\\S.*)$");

    /** docker-compose.prod.yml 의 시크릿 환경변수 키 라인. */
    private static final Pattern COMPOSE_SECRET_ENV_LINE =
            Pattern.compile("^\\s*(" + NAME_ALT + ")\\s*:\\s*(\\S.*)$");

    /** 무기본값 플레이스홀더 {@code ${NAME}} (따옴표 허용). */
    private static final Pattern BARE_PLACEHOLDER =
            Pattern.compile("^[\"']?\\$\\{[A-Za-z_][A-Za-z0-9_]*\\}[\"']?$");

    /** RHS 선두의 따옴표 문자열 한 덩어리. */
    private static final Pattern QUOTED_SEGMENT = Pattern.compile("\"([^\"]*)\"|'([^']*)'");

    /** DB 진단 도구에서 접속정보가 환경변수 미설정 시 리터럴로 폴백하는 경로를 차단한다. */
    private static final Pattern JS_DB_ENV_LITERAL_FALLBACK = Pattern.compile(
            "process\\.env\\.(DB_HOST|DB_NAME|DB_USERNAME|DB_PASSWORD)\\s*(?:\\|\\||\\?\\?)\\s*[\"'`]([^\"'`]*)[\"'`]");

    /** DB 클라이언트 설정 객체에 접속정보를 직접 인라인하는 우회 경로를 차단한다. */
    private static final Pattern JS_DB_CONFIG_LITERAL = Pattern.compile(
            "^\\s*(host|database|user|password)\\s*:\\s*[\"'`]([^\"'`]*)[\"'`]\\s*,?\\s*$");

    /** E2E 프로파일의 DB 접속 환경변수에 붙은 기본값(원격 호스트·계정 재유입 포함)을 차단한다. */
    private static final Pattern E2E_DB_PLACEHOLDER_DEFAULT = Pattern.compile(
            "\\$\\{(DB_URL|DB_HOST|DB_PORT|DB_NAME|DB_USERNAME|DB_PASSWORD)\\s*:([^}]*)\\}");

    private static final Pattern LOCAL_DB_URL_LINE = Pattern.compile(
            "^\\s*(url|jdbc-url)\\s*:\\s*(\\S.*)$");
    private static final Pattern LOCAL_DB_URL_DEFAULT = Pattern.compile(
            "^\\$\\{DB_URL:(jdbc:[^}]*)\\}$");

    /**
     * 변수 참조·명령 치환 제거 패턴. 이 목록을 넓히면 리터럴이 "참조"로 오인돼 위반이 사라지므로,
     * 확장 시 반드시 사유를 남긴다(AGENTS.md Evidence guardrails H2). 순서 의존: {@code ${…}}·{@code $(…)} 를 먼저 지운다.
     */
    private static final List<String> VARIABLE_REF_PATTERNS = List.of(
            "\\$env:[A-Za-z_][A-Za-z0-9_]*",
            "\\$\\{[^}]*\\}",
            "\\$\\([^)]*\\)",
            "`[^`]*`",
            "\\$[A-Za-z_0-9]+");

    @Test
    @DisplayName("🔐 시크릿 리터럴 재유입 차단 — 배포 스크립트 인라인 대입 + 운영 설정 기본값 (Wave 0 W0-04 회귀 방지)")
    void auditSecretLiterals() throws IOException {
        Path root = resolveRepoRoot();
        List<String> violations = new ArrayList<>();

        // ── 1) scripts/ 하위 셸·파워셸 스크립트 ────────────────────────────────────────
        Path scriptsDir = root.resolve(SCRIPTS_DIR);
        if (!Files.isDirectory(scriptsDir)) {
            fail("게이트 무결성 파손: '" + SCRIPTS_DIR + "' 디렉터리를 찾을 수 없습니다 (root="
                    + root.toAbsolutePath() + "). 조용한 skip 은 false-green → 실패 처리.");
        }
        List<Path> scripts = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(scriptsDir)) {
            paths.filter(Files::isRegularFile)
                    .filter(SecretLiteralLinterTest::isScript)
                    .sorted()
                    .forEach(scripts::add);
        }
        // vacuity 하한(실측 2026-08-01: .sh 3 + .ps1 8 = 11)
        if (scripts.size() < 8) {
            fail("게이트 무결성 파손: scripts/ 스캔 결과(" + scripts.size()
                    + ")가 예상 하한(8) 미만 — 경로/확장자 필터 파손 의심 (실측 11).");
        }
        for (Path script : scripts) {
            auditScript(root, script, violations);
        }

        // ── 2) .agent/scripts 하위 JavaScript DB 도구 ────────────────────────────────
        Path agentScriptsDir = root.resolve(AGENT_SCRIPTS_DIR);
        if (!Files.isDirectory(agentScriptsDir)) {
            fail("게이트 무결성 파손: '" + AGENT_SCRIPTS_DIR + "' 디렉터리를 찾을 수 없습니다 (root="
                    + root.toAbsolutePath() + "). 조용한 skip 은 false-green → 실패 처리.");
        }
        List<Path> agentJavaScripts = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(agentScriptsDir)) {
            paths.filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".js"))
                    .sorted()
                    .forEach(agentJavaScripts::add);
        }
        if (agentJavaScripts.size() < 8) {
            fail("게이트 무결성 파손: .agent/scripts JavaScript 스캔 결과(" + agentJavaScripts.size()
                    + ")가 예상 하한(8) 미만 — 경로/확장자 필터 파손 의심.");
        }
        for (Path script : agentJavaScripts) {
            auditAgentJavaScript(root, script, violations);
        }

        // ── 3) 운영 배포 설정 2종 + 외부 연결 가능 E2E DB 설정 ─────────────────────────
        Path appProd = root.resolve(APP_PROD_YML);
        Path appE2e = root.resolve(APP_E2E_YML);
        Path appLocal = root.resolve(APP_LOCAL_YML);
        Path composeProd = root.resolve(COMPOSE_PROD_YML);
        int prodConfigs = 0;
        for (Path required : List.of(appProd, composeProd)) {
            if (Files.isRegularFile(required)) {
                prodConfigs++;
            } else {
                fail("게이트 무결성 파손: 운영 배포 설정을 찾을 수 없습니다 — " + required.toAbsolutePath()
                        + ". 파일이 사라지면 이 게이트는 아무것도 검사하지 않는 vacuous 통과가 됩니다.");
            }
        }
        if (prodConfigs < 2) {
            fail("게이트 무결성 파손: 운영 배포 설정 스캔(" + prodConfigs + ")이 하한(2) 미만.");
        }
        if (!Files.isRegularFile(appE2e)) {
            fail("게이트 무결성 파손: E2E DB 설정을 찾을 수 없습니다 — " + appE2e.toAbsolutePath()
                    + ". 외부 DB 기본값 재유입 검사가 vacuous 통과하지 않도록 실패 처리합니다.");
        }
        Set<String> secretsSeen = new TreeSet<>();
        auditSpringProdYml(root, appProd, violations, secretsSeen);
        auditComposeProdYml(root, composeProd, violations, secretsSeen);
        auditE2eDbConfig(root, appE2e, violations);
        boolean localDbConfigScanned = auditLocalDbConfigIfPresent(root, appLocal, violations);

        // vacuity 하한(실측: JWT_SECRET·ALGORITHM_KEY·OLD_ALGORITHM_KEY·DB_PASSWORD·ADMIN_INITIAL_PASSWORD = 5종)
        if (secretsSeen.size() < 3) {
            fail("게이트 무결성 파손: 운영 설정에서 참조되는 시크릿 이름이 " + secretsSeen.size()
                    + "종 — 하한(3) 미만입니다 (실측 5종). 파일 내용/파싱 파손 또는 시크릿 주입 경로 소멸 의심: " + secretsSeen);
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔐 [SECRET LITERAL LINTER] 시크릿 리터럴/기본값이 배포 경로에 재유입되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 처방:\n");
            sb.append("   · 배포 스크립트는 시크릿을 '주입'하지 말고 '검증'하십시오 — 미설정이면 exit 1 (scripts/deploy.sh 참조).\n");
            sb.append("   · docker-compose.prod.yml 은 ${NAME:?사유} 형태로 미설정을 오류로 만드십시오 (:- 기본값 금지).\n");
            sb.append("   · application-prod.yml 의 시크릿은 무기본값 ${NAME} 이어야 기동 fail-fast 가 성립합니다.\n");
            sb.append("   · application-e2e.yml 의 DB 접속정보도 무기본값 ${DB_*} 이어야 합니다.\n");
            sb.append("   · 개발 편의 기본값이 필요하면 로컬 전용 base/dev/test 프로파일에만 두십시오.\n");
            sb.append("\n💡 근거: 2026-08-01 W0-04 — deploy.sh 가 JWT_SECRET 미설정 시 저장소에 커밋된 dev 서명 키를\n");
            sb.append("   경고만 남기고 주입하고 있었습니다(공개 키로 서명된 운영 토큰 = 임의 계정 위조 가능).\n");
            fail(sb.toString());
        }

        log.info("✅ 시크릿 리터럴 재유입 없음 — 배포 스크립트 {}건 + 에이전트 JS {}건 + 운영 설정 {}건 + E2E DB 설정 1건 + local DB 설정 {}건 스캔, 보호 대상 {}종(운영 참조 {}종).",
                scripts.size(), agentJavaScripts.size(), prodConfigs, localDbConfigScanned ? 1 : 0,
                SECRET_ENV_NAMES.size(), secretsSeen.size());
    }

    @Test
    @DisplayName("Git 제외 local 설정이 없는 clean clone에서도 운영/E2E 게이트는 유효하다")
    void ignoredLocalConfigMayBeAbsent(@TempDir Path cleanRoot) throws IOException {
        Path missingLocalConfig = cleanRoot.resolve(APP_LOCAL_YML);

        assertFalse(auditLocalDbConfigIfPresent(cleanRoot, missingLocalConfig, new ArrayList<>()));
    }

    // ---- 1) 배포 스크립트 -----------------------------------------------------------

    private void auditScript(Path root, Path script, List<String> violations) throws IOException {
        boolean powerShell = script.toString().endsWith(".ps1");
        String name = rel(root, script);
        String[] lines = readText(script).split("\r?\n", -1);

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line.stripLeading().startsWith("#")) {
                continue; // 주석 줄 — 과거 사례를 문서로 인용하는 것은 위반이 아니다
            }

            // (a) 시크릿 환경변수에 리터럴 대입
            Matcher assign = (powerShell ? PS_ENV_ASSIGN : SHELL_ASSIGN).matcher(line);
            while (assign.find()) {
                String literal = literalPayload(line.substring(assign.end()), powerShell);
                if (literal != null) {
                    violations.add(String.format(
                            "File [%s:%d]: 시크릿 '%s' 에 리터럴 값을 대입합니다 (…= %s). 라인: '%s'",
                            name, i + 1, assign.group(1), truncate(literal), line.trim()));
                }
            }

            // (b) 파워셸 [Environment]::SetEnvironmentVariable("NAME","리터럴")
            if (powerShell) {
                Matcher setter = PS_SET_ENV_LITERAL.matcher(line);
                while (setter.find()) {
                    String literal = stripVariableRefs(setter.group(2));
                    if (!literal.isEmpty()) {
                        violations.add(String.format(
                                "File [%s:%d]: 시크릿 '%s' 을 SetEnvironmentVariable 로 리터럴 설정합니다 (%s).",
                                name, i + 1, setter.group(1), truncate(literal)));
                    }
                }
            }

            // (c) ${NAME:-기본값} — 미설정 시 조용한 dev 값 대체(W0-04 의 본질)
            collectPosixDefaults(line, name, i + 1, violations);
        }
    }

    private void auditAgentJavaScript(Path root, Path script, List<String> violations) throws IOException {
        String name = rel(root, script);
        String[] lines = readText(script).split("\r?\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line.stripLeading().startsWith("//") || line.stripLeading().startsWith("*")) {
                continue;
            }

            Matcher fallback = JS_DB_ENV_LITERAL_FALLBACK.matcher(line);
            while (fallback.find()) {
                violations.add(String.format(
                        "File [%s:%d]: DB 접속 변수 '%s' 가 리터럴 기본값으로 폴백합니다 (%s).",
                        name, i + 1, fallback.group(1), truncate(fallback.group(2))));
            }

            Matcher inlineConfig = JS_DB_CONFIG_LITERAL.matcher(line);
            if (inlineConfig.find() && !inlineConfig.group(2).isBlank()) {
                violations.add(String.format(
                        "File [%s:%d]: DB 접속 설정 '%s' 에 리터럴을 직접 인라인했습니다 (%s).",
                        name, i + 1, inlineConfig.group(1), truncate(inlineConfig.group(2))));
            }
        }
    }

    /** RHS 가 리터럴을 담고 있으면 그 잔여 문자열을, 아니면 null 을 돌려준다. */
    private static String literalPayload(String rhs, boolean powerShell) {
        String s = rhs.trim();
        if (s.isEmpty()) {
            return null; // 빈 대입은 위반이 아니다
        }
        Matcher quoted = QUOTED_SEGMENT.matcher(s);
        if (quoted.lookingAt()) {
            String inner = quoted.group(1) != null ? quoted.group(1) : quoted.group(2);
            String residue = stripVariableRefs(inner);
            return residue.isEmpty() ? null : residue;
        }
        if (powerShell) {
            // 파워셸의 비-따옴표 RHS 는 명령 호출(예: Read-Host)일 수 있어 리터럴로 단정하지 않는다.
            return null;
        }
        // 셸에서 비-따옴표 RHS 단일 토큰은 문자열 리터럴 대입이다 (NAME=egov123).
        String token = s.split("\\s")[0];
        while (token.endsWith(";") || token.endsWith("&")) {
            token = token.substring(0, token.length() - 1);
        }
        String residue = stripVariableRefs(token);
        return residue.isEmpty() ? null : residue;
    }

    /** 변수 참조·명령 치환·따옴표·연결자를 제거하고 남은 '진짜 값'을 돌려준다. */
    private static String stripVariableRefs(String value) {
        String s = value;
        for (String p : VARIABLE_REF_PATTERNS) {
            s = s.replaceAll(p, "");
        }
        s = s.replaceAll("[\"'()+\\s]", "");
        return s.trim();
    }

    private void collectPosixDefaults(String line, String fileLabel, int lineNo, List<String> violations) {
        Matcher m = POSIX_DEFAULT_SUBSTITUTION.matcher(line);
        while (m.find()) {
            if (!m.group(2).isBlank()) {
                violations.add(String.format(
                        "File [%s:%d]: 시크릿 '%s' 에 기본값 대체(${%s:-…})가 걸려 있습니다 — 미설정이 조용히 통과합니다. 라인: '%s'",
                        fileLabel, lineNo, m.group(1), m.group(1), line.trim()));
            }
        }
    }

    // ---- 2) 운영 배포 설정 ----------------------------------------------------------

    private void auditSpringProdYml(Path root, Path file, List<String> violations, Set<String> secretsSeen)
            throws IOException {
        String name = rel(root, file);
        String[] lines = readText(file).split("\r?\n", -1);

        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            if (raw.stripLeading().startsWith("#")) {
                continue;
            }
            String line = stripYamlComment(raw);

            // (a) 시크릿 플레이스홀더에 기본값이 붙으면 fail-fast 가 무너진다
            Matcher def = SPRING_PLACEHOLDER_DEFAULT.matcher(line);
            while (def.find()) {
                secretsSeen.add(def.group(1));
                violations.add(String.format(
                        "File [%s:%d]: 운영 프로파일의 시크릿 '%s' 에 기본값이 붙었습니다 (${%s:%s}) — 미설정 시 기동 fail-fast 가 무력화됩니다.",
                        name, i + 1, def.group(1), def.group(1), truncate(def.group(2))));
            }
            for (String secret : SECRET_ENV_NAMES) {
                if (line.contains("${" + secret + "}")) {
                    secretsSeen.add(secret);
                }
            }

            // (b) 시크릿 보유 키의 값은 무기본값 플레이스홀더여야 한다(리터럴 인라인 차단)
            Matcher key = SECRET_YAML_KEY_LINE.matcher(line);
            if (key.find()) {
                String value = key.group(2).trim();
                if (!BARE_PLACEHOLDER.matcher(value).matches()) {
                    violations.add(String.format(
                            "File [%s:%d]: 운영 시크릿 키 '%s' 의 값이 무기본값 플레이스홀더가 아닙니다 (%s).",
                            name, i + 1, key.group(1), truncate(value)));
                }
            }
        }
    }

    private void auditComposeProdYml(Path root, Path file, List<String> violations, Set<String> secretsSeen)
            throws IOException {
        String name = rel(root, file);
        String[] lines = readText(file).split("\r?\n", -1);

        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            if (raw.stripLeading().startsWith("#")) {
                continue;
            }
            String line = stripYamlComment(raw);

            // (a) POSIX 기본값 치환 — compose 는 ${NAME:?사유} 가 정상, ${NAME:-값} 이 위반
            collectPosixDefaults(line, name, i + 1, violations);

            // (b) 시크릿 환경변수 키의 값은 변수 참조여야 한다(리터럴 인라인 차단)
            Matcher env = COMPOSE_SECRET_ENV_LINE.matcher(line);
            if (env.find()) {
                secretsSeen.add(env.group(1));
                String value = env.group(2).trim();
                if (!value.contains("${")) {
                    violations.add(String.format(
                            "File [%s:%d]: 운영 오버레이가 시크릿 '%s' 에 리터럴을 인라인했습니다 (%s) — ${%s:?사유} 형태로 바꾸십시오.",
                            name, i + 1, env.group(1), truncate(value), env.group(1)));
                }
            }
        }
    }

    private void auditE2eDbConfig(Path root, Path file, List<String> violations) throws IOException {
        String name = rel(root, file);
        String[] lines = readText(file).split("\\r?\\n", -1);
        int dbReferences = 0;
        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            if (raw.stripLeading().startsWith("#")) {
                continue;
            }
            String line = stripYamlComment(raw);
            for (String dbName : List.of("DB_URL", "DB_USERNAME", "DB_PASSWORD")) {
                if (line.contains("${" + dbName + "}")) {
                    dbReferences++;
                }
            }
            Matcher defaultValue = E2E_DB_PLACEHOLDER_DEFAULT.matcher(line);
            while (defaultValue.find()) {
                violations.add(String.format(
                        "File [%s:%d]: E2E DB 접속 변수 '%s' 에 저장소 기본값이 붙었습니다 (%s). 무기본값 ${%s} 로 주입을 강제하십시오.",
                        name, i + 1, defaultValue.group(1), truncate(defaultValue.group(2)), defaultValue.group(1)));
            }
        }
        if (dbReferences < 3) {
            fail("게이트 무결성 파손: " + name + " 에서 무기본값 DB_URL/DB_USERNAME/DB_PASSWORD 참조가 "
                    + dbReferences + "건뿐입니다 — DB 접속정보 외부화가 우회되었을 수 있습니다.");
        }
    }

    private void auditLocalDbConfig(Path root, Path file, List<String> violations) throws IOException {
        String name = rel(root, file);
        String[] lines = readText(file).split("\\r?\\n", -1);
        int dbUrlLines = 0;
        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            if (raw.stripLeading().startsWith("#")) {
                continue;
            }
            Matcher urlLine = LOCAL_DB_URL_LINE.matcher(stripYamlComment(raw));
            if (!urlLine.matches()) {
                continue;
            }
            dbUrlLines++;
            String value = urlLine.group(2).trim();
            if (!value.startsWith("${DB_URL")) {
                violations.add(String.format(
                        "File [%s:%d]: local DB URL은 DB_URL 환경변수 플레이스홀더여야 합니다.", name, i + 1));
                continue;
            }
            Matcher defaultUrl = LOCAL_DB_URL_DEFAULT.matcher(value);
            if (defaultUrl.matches()) {
                String jdbc = defaultUrl.group(1);
                try {
                    String host = java.net.URI.create(jdbc.substring("jdbc:".length())).getHost();
                    if (!"localhost".equalsIgnoreCase(host)
                            && !"127.0.0.1".equals(host)
                            && !"::1".equals(host)
                            && !"[::1]".equals(host)) {
                        violations.add(String.format(
                                "File [%s:%d]: local 프로파일 DB 기본 호스트가 loopback이 아닙니다 (%s). 외부 DB는 DB_URL로 명시 주입하십시오.",
                                name, i + 1, host));
                    }
                } catch (RuntimeException malformed) {
                    violations.add(String.format(
                            "File [%s:%d]: local DB_URL 기본값을 URI로 해석할 수 없습니다.", name, i + 1));
                }
            }
        }
        if (dbUrlLines < 2) {
            fail("게이트 무결성 파손: " + name + " 의 url/jdbc-url 스캔이 하한(2) 미만입니다.");
        }
    }

    private boolean auditLocalDbConfigIfPresent(Path root, Path file, List<String> violations) throws IOException {
        if (!Files.exists(file)) {
            return false;
        }
        if (!Files.isRegularFile(file)) {
            fail("게이트 무결성 파손: local DB 설정 경로가 일반 파일이 아닙니다 — " + file.toAbsolutePath());
        }
        auditLocalDbConfig(root, file, violations);
        return true;
    }

    // ---- 공통 유틸 -------------------------------------------------------------------

    private static boolean isScript(Path p) {
        String fileName = p.getFileName().toString();
        for (String ext : SCRIPT_EXTENSIONS) {
            if (fileName.endsWith(ext)) {
                return true;
            }
        }
        return false;
    }

    /** 앞에 공백이 오는 '#' 부터가 YAML 주석 — 값 내부의 '#' 오탐을 줄인다. */
    private static String stripYamlComment(String line) {
        return line.replaceAll("\\s#.*$", "");
    }

    /**
     * BOM 인지 디코딩. 두 가지 실측 이유가 있다.
     * <ul>
     *   <li>{@code scripts/setup_remote.sh} 는 UTF-16LE 로 저장돼 있다 — UTF-8 로 읽으면 문자 사이에 NUL 이
     *       끼어 어떤 패턴에도 매칭되지 않는, 즉 <b>인코딩만으로 게이트를 빠져나가는</b> 파일이 된다.</li>
     *   <li>{@code Files.readString} 은 MalformedInput 에 예외를 던져 게이트 자체를 죽인다. 대체문자
     *       디코딩({@code new String(byte[], Charset)})을 써서 스캔은 계속하되 조용히 넘어가지 않게 한다.</li>
     * </ul>
     */
    private static String readText(Path p) throws IOException {
        byte[] bytes = Files.readAllBytes(p);
        if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xFE) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16LE);
        }
        if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFE && (bytes[1] & 0xFF) == 0xFF) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16BE);
        }
        String text = new String(bytes, StandardCharsets.UTF_8);
        return text.startsWith("\uFEFF") ? text.substring(1) : text; // UTF-8 BOM 제거
    }

    private static String truncate(String value) {
        String s = value.trim();
        return s.length() <= 40 ? s : s.substring(0, 40) + "…";
    }

    private static String rel(Path root, Path p) {
        return root.toAbsolutePath().relativize(p.toAbsolutePath()).toString().replace('\\', '/');
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
        Path fallback = Paths.get("").toAbsolutePath().getParent();
        if (fallback != null && Files.exists(fallback.resolve("settings.gradle"))) {
            return fallback;
        }
        fail("게이트 무결성 파손: settings.gradle 로 저장소 루트를 찾지 못함(cwd="
                + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green → 실패 처리.");
        return Paths.get(""); // unreachable
    }
}
