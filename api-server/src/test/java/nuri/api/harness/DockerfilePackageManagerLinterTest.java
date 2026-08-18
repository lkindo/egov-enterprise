package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🐳 Dockerfile 패키지 매니저 결정성 린터 — "CI 가 검증한 트리 ≠ 배포되는 트리" 회귀 차단.
 *
 * <p>[근거] 2026-08-01(Wave 0) 이전의 {@code frontend/Dockerfile} 은 {@code npm install} 로 의존성을
 * 설치했다. 그런데 frontend 에는 {@code package-lock.json} 이 <b>없고</b> {@code pnpm-lock.yaml} 만 있다.
 * 즉 이미지 빌드는 매번 {@code package.json} 의 캐럿 범위(예: {@code next ^16.2.4})를 <b>그 시점에 새로
 * 해석</b>했다. CI(ci.yml)는 {@code pnpm install --frozen-lockfile} 로 lock 에 고정된 트리를 검증하는데,
 * 배포 이미지는 그와 다른 트리로 빌드될 수 있었다 — <b>테스트를 통과한 것과 배포되는 것이 같다는 보장이
 * 없었다.</b> 게다가 이 불일치는 어떤 게이트도 red 로 만들지 않는다(빌드는 성공한다). Wave 0 에서
 * {@code corepack enable} + {@code pnpm install --frozen-lockfile} 로 통일했고, 이 게이트는 그 봉합이
 * 조용히 되돌아가는 것을 기계로 막는다.
 *
 * <p>[규칙] 저장소의 모든 Dockerfile 중 <b>JS 빌드가 있는 것</b>(node 베이스 스테이지가 있거나
 * pnpm/npm/yarn/corepack 을 호출하는 것)에 대해:
 * <ul>
 *   <li>❌ {@code npm install|ci|i|add|update|run|exec|rebuild} — 비결정적 설치·비표준 러너</li>
 *   <li>❌ {@code yarn install|add|...} — {@code frontend/package.json#packageManager}가 pnpm을 지정한다.</li>
 *   <li>❌ {@code pnpm install} 인데 {@code --frozen-lockfile} 이 없음(또는 {@code --no-frozen-lockfile}
 *       / {@code frozen-lockfile=false} 로 무력화) — lock 드리프트가 조용히 통과한다</li>
 *   <li>❌ 저장소 전체에서 {@code pnpm install --frozen-lockfile} 이 0건 — 고정 설치 자체의 소멸</li>
 * </ul>
 * JS 와 무관한 Dockerfile({@code api-server/Dockerfile} = gradle/temurin 베이스)은 <b>예외 목록이 아니라
 * 판정 자체로</b> 대상에서 빠진다(AGENTS.md Evidence guardrails H2: 제외 목록을 만들지 않는다).
 *
 * <p>[주의] Dockerfile 주석(줄 첫 글자 {@code #})은 반드시 제거한 뒤 검사한다 — Wave 0 의 설명 주석이
 * "종전의 {@code npm install} 은…" 이라는 문장을 담고 있어, 주석을 그대로 스캔하면 이 게이트는 자기 자신이
 * 고친 파일을 위반으로 잡는다(거짓 red = 게이트 신뢰 붕괴). 줄 끝 {@code \} 연속행은 하나의 논리 명령으로
 * 합친 뒤 판정한다({@code RUN pnpm install \} 개행 {@code --frozen-lockfile} 형태의 오탐 방지).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 텍스트 스캔. 경로 해석은 IdentityAxisLinterTest 의
 * {@code resolveRepoRoot()}(settings.gradle 탐색) 관행을 따른다 — 테스트 JVM 의 workingDir 은 모듈
 * 디렉터리(api-server)다.
 */
class DockerfilePackageManagerLinterTest {

    private static final Logger log = LoggerFactory.getLogger(DockerfilePackageManagerLinterTest.class);

    /**
     * 탐색 시 내려가지 않는 디렉터리 — <b>예외(면제) 목록이 아니라 스캔 범위 정의</b>다.
     * 벤더 트리(node_modules)에는 서드파티 패키지의 Dockerfile 이 섞여 있어 우리 규칙의 대상이 아니고,
     * 빌드 산출물(build/.next/dist/out/…)은 소스가 아니다. 저장소 전수 walk 의 비용도 여기서 결정된다.
     */
    private static final Set<String> PRUNED_DIRS = Set.of(
            "node_modules", ".git", "build", ".gradle", ".next", "out", "dist",
            "coverage", "test-results", "playwright-report", "target", ".idea", ".vscode");

    /**
     * npm 계열 호출. <b>lookbehind 가 이 정규식의 핵심이다</b> — {@code "pnpm install"} 은
     * {@code "npm install"} 을 부분문자열로 포함하므로, 경계가 없으면 정답(pnpm)을 위반으로 잡는다.
     */
    private static final Pattern NPM_COMMAND = Pattern.compile(
            "(?<![\\w.-])npm(?:\\.cmd)?\\s+(?:install|ci|i|add|update|run|exec|rebuild)\\b");

    /** yarn 계열 호출(인자 없는 {@code yarn} 단독 = install 이므로 줄 끝 형태도 포함). */
    private static final Pattern YARN_COMMAND = Pattern.compile(
            "(?<![\\w.-])yarn(?:\\.cmd)?(?:\\s+(?:install|add|ci|run|global|import|set)\\b|\\s*$)");

    /** pnpm 설치 명령({@code install} / 별칭 {@code i}). {@code pnpm import} 등은 매칭되지 않는다. */
    private static final Pattern PNPM_INSTALL = Pattern.compile(
            "(?<![\\w.-])pnpm(?:\\.cmd)?\\s+(?:install|i)(?![\\w-])");

    /** lock 고정 플래그. {@code --frozen-lockfile=false} 를 고정으로 오인하지 않도록 뒤 경계를 둔다. */
    private static final Pattern FROZEN_LOCKFILE = Pattern.compile("--frozen-lockfile(?![\\w=-])");

    /** 고정을 명시적으로 끄는 형태(CLI 플래그 · ENV/설정 형태 모두). */
    private static final Pattern UNFROZEN_LOCKFILE = Pattern.compile(
            "--no-frozen-lockfile\\b|frozen[-_]lockfile\\s*=\\s*false");

    /** 이 Dockerfile 이 JS 빌드에 관여하는가(node 베이스가 아니어도 패키지 매니저를 부르면 대상). */
    private static final Pattern JS_PACKAGE_MANAGER = Pattern.compile(
            "(?<![\\w.-])(?:pnpm|npm|yarn|corepack)(?![\\w-])");

    /** {@code FROM [--platform=…] <image> [AS <name>]} 에서 이미지 토큰 추출. */
    private static final Pattern FROM_INSTRUCTION = Pattern.compile("(?i)^FROM\\s+(?:--[\\w-]+=\\S+\\s+)*(\\S+)");

    // ---- vacuity 하한(스캔 붕괴 = false-green 방지). 2026-08-01 실측: 2 / 61 / 1 / 1 --------------
    private static final int MIN_DOCKERFILES = 2;
    private static final int MIN_INSTRUCTION_LINES = 25;
    private static final int MIN_JS_DOCKERFILES = 1;

    @Test
    @DisplayName("🐳 Dockerfile 패키지 매니저 결정성 — npm/yarn 금지 + pnpm --frozen-lockfile 강제 (배포=CI 트리 동일성)")
    void auditDockerfilePackageManager() throws IOException {
        Path root = resolveRepoRoot();
        List<Path> dockerfiles = findDockerfiles(root);

        // 게이트 무결성 ①: 경로 해석/탐색이 조용히 붕괴하면 "위반 0" 이 아니라 "본 것이 없음" 이다.
        if (dockerfiles.size() < MIN_DOCKERFILES) {
            fail("게이트 무결성 파손: Dockerfile 탐색 결과(" + dockerfiles.size() + ")가 예상 하한("
                    + MIN_DOCKERFILES + ") 미만 — 경로 해석/탐색 파손 의심 (root=" + root.toAbsolutePath()
                    + ", workingDir=" + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green → 실패 처리.");
        }

        List<String> violations = new ArrayList<>();
        int totalInstructions = 0;
        int jsDockerfiles = 0;
        int frozenInstalls = 0;

        for (Path file : dockerfiles) {
            List<Instruction> instructions = readInstructions(file);
            totalInstructions += instructions.size();

            boolean nodeStage = false;
            boolean mentionsPackageManager = false;
            for (Instruction ins : instructions) {
                Matcher from = FROM_INSTRUCTION.matcher(ins.text());
                if (from.find() && isNodeImage(from.group(1))) {
                    nodeStage = true;
                }
                if (JS_PACKAGE_MANAGER.matcher(ins.text()).find()) {
                    mentionsPackageManager = true;
                }
            }
            if (!nodeStage && !mentionsPackageManager) {
                continue; // JS 빌드와 무관한 이미지(예: gradle/temurin) — 규칙 적용 대상이 아니다
            }
            jsDockerfiles++;

            for (Instruction ins : instructions) {
                String text = ins.text();
                if (NPM_COMMAND.matcher(text).find()) {
                    violations.add(where(root, file, ins) + " — npm 계열 호출. 이 저장소에 package-lock.json 은 없고"
                            + " pnpm-lock.yaml 만 있어 npm 설치는 매 빌드 캐럿 범위를 새로 해석합니다(비결정적).");
                }
                if (YARN_COMMAND.matcher(text).find()) {
                    violations.add(where(root, file, ins) + " — yarn 호출. 이 저장소의 패키지 매니저는 pnpm 하나입니다.");
                }
                if (PNPM_INSTALL.matcher(text).find()) {
                    boolean frozen = FROZEN_LOCKFILE.matcher(text).find();
                    boolean unfrozen = UNFROZEN_LOCKFILE.matcher(text).find();
                    if (frozen && !unfrozen) {
                        frozenInstalls++;
                    } else {
                        violations.add(where(root, file, ins) + " — pnpm 설치에 --frozen-lockfile 이 "
                                + (unfrozen ? "명시적으로 해제되어" : "없어") + " lock 드리프트가 조용히 통과합니다.");
                    }
                }
            }
        }

        // 게이트 무결성 ②③: 명령 라인 수집·JS 대상 판정이 붕괴해도 위반 0 으로 보인다.
        if (totalInstructions < MIN_INSTRUCTION_LINES) {
            fail("게이트 무결성 파손: Dockerfile 명령 라인 수집(" + totalInstructions + ")이 예상 하한("
                    + MIN_INSTRUCTION_LINES + ") 미만 — 주석 제거/연속행 병합 로직 파손 의심.");
        }
        if (jsDockerfiles < MIN_JS_DOCKERFILES) {
            fail("게이트 무결성 파손: JS 빌드 Dockerfile 판정(" + jsDockerfiles + ")이 예상 하한("
                    + MIN_JS_DOCKERFILES + ") 미만 — FROM 파싱/패키지 매니저 탐지 파손 의심."
                    + " (frontend/Dockerfile 이 대상에서 빠지면 이 게이트는 아무것도 지키지 않는다.)");
        }
        // 고정 설치의 '소멸' — 명령을 바꾸지 않고 통째로 지우는 형태의 회귀는 위반 정규식으로 잡히지 않는다.
        if (frozenInstalls < 1) {
            violations.add("저장소 전체에서 `pnpm install --frozen-lockfile` 이 0건입니다 —"
                    + " lock 고정 설치가 사라지면 배포 이미지의 의존성 트리를 아무도 보장하지 않습니다.");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🐳 [DOCKERFILE PACKAGE MANAGER LINTER] 배포 이미지의 의존성 결정성이 깨졌습니다!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 CI(ci.yml)는 `pnpm install --frozen-lockfile` 로 검증합니다. 이미지가 다른 방식으로\n");
            sb.append("   설치하면 '테스트를 통과한 트리'와 '배포되는 트리'가 달라지고, 그 차이는 어떤 게이트도\n");
            sb.append("   red 로 만들지 않습니다(빌드는 성공합니다). 2026-08-01 Wave 0 에서 정정한 결함입니다.\n");
            sb.append("💡 처방: `RUN corepack enable` + `RUN pnpm install --frozen-lockfile`\n");
            sb.append("   (lock 과 package.json 이 어긋나면 빌드가 실패하는 것이 의도된 동작입니다.)\n");
            fail(sb.toString());
        } else {
            log.info("✅ Dockerfile 패키지 매니저 결정성 OK — Dockerfile {}개(JS 빌드 대상 {}개), 명령 {}줄,"
                            + " pnpm --frozen-lockfile 설치 {}건, npm/yarn 호출 0건.",
                    dockerfiles.size(), jsDockerfiles, totalInstructions, frozenInstalls);
        }
    }

    // ---- Dockerfile 수집 -------------------------------------------------------------

    /** {@code Dockerfile} · {@code Dockerfile.<suffix>} · {@code <name>.Dockerfile} 을 대상으로 본다. */
    private static boolean isDockerfileName(String name) {
        return name.equals("Dockerfile") || name.startsWith("Dockerfile.") || name.endsWith(".Dockerfile");
    }

    private static List<Path> findDockerfiles(Path root) throws IOException {
        List<Path> found = new ArrayList<>();
        Files.walkFileTree(root, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                Path name = dir.getFileName();
                if (name != null && !dir.equals(root) && PRUNED_DIRS.contains(name.toString())) {
                    return FileVisitResult.SKIP_SUBTREE;
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
                Path name = file.getFileName();
                if (name != null && isDockerfileName(name.toString())) {
                    found.add(file);
                }
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFileFailed(Path file, IOException exc) {
                return FileVisitResult.CONTINUE; // 접근 불가 파일 하나가 전체 스캔을 죽이지 않도록
            }
        });
        found.sort(Comparator.naturalOrder());
        return found;
    }

    // ---- Dockerfile 파싱 -------------------------------------------------------------

    /** 논리 명령 1건(줄 번호 = 명령이 시작한 물리 라인). */
    private record Instruction(int line, String text) {
    }

    /**
     * 주석 줄({@code #} 로 시작)을 버리고, 줄 끝 {@code \} 연속행을 하나의 논리 명령으로 합친다.
     * Docker 는 연속행 <b>도중에도</b> 주석 줄을 허용하므로 주석 판정을 먼저 한다.
     */
    private static List<Instruction> readInstructions(Path file) throws IOException {
        String raw = Files.readString(file, StandardCharsets.UTF_8);
        List<Instruction> result = new ArrayList<>();
        String[] lines = raw.split("\r?\n", -1);
        StringBuilder buffer = null;
        int startLine = -1;

        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();
            if (trimmed.startsWith("#")) {
                continue; // Dockerfile 주석은 줄 전체(인라인 '#' 는 주석이 아니다)
            }
            if (buffer == null) {
                if (trimmed.isEmpty()) {
                    continue;
                }
                buffer = new StringBuilder();
                startLine = i + 1;
            }
            boolean continued = trimmed.endsWith("\\");
            buffer.append(continued ? trimmed.substring(0, trimmed.length() - 1) : trimmed).append(' ');
            if (!continued) {
                result.add(new Instruction(startLine, buffer.toString().trim()));
                buffer = null;
            }
        }
        if (buffer != null) {
            result.add(new Instruction(startLine, buffer.toString().trim()));
        }
        return result;
    }

    /** {@code node} · {@code node:20-alpine} · {@code <registry>/node:20} 을 node 베이스로 본다. */
    private static boolean isNodeImage(String image) {
        String img = image.toLowerCase(Locale.ROOT);
        int slash = img.lastIndexOf('/');
        String last = slash >= 0 ? img.substring(slash + 1) : img;
        return last.equals("node") || last.startsWith("node:");
    }

    // ---- 경로 해석/표기 --------------------------------------------------------------

    /** cwd 또는 상위에서 settings.gradle 을 가진 저장소 루트를 찾는다(IdentityAxisLinterTest 관행). */
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

    private static String where(Path root, Path file, Instruction ins) {
        String rel = root.relativize(file).toString().replace('\\', '/');
        String text = ins.text();
        String shown = text.length() > 120 ? text.substring(0, 117) + "..." : text;
        return rel + ":" + ins.line() + "  `" + shown + "`";
    }
}
