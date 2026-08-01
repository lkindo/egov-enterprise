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
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔐 알려진 자격증명의 <b>운영 마이그레이션 재유입</b> 차단 게이트 (W0-02 회귀 방지).
 *
 * <p>[근거] 2026-08-01 이전까지 {@code R__seed_framework.sql}(관리자 webmaster)과
 * {@code R__seed_demo.sql}(일반 사용자 TEST1)이 <b>bcrypt('1') 해시를 운영 마이그레이션 경로
 * (classpath:db/migration)에 동봉</b>하고 있었다. 이 저장소는 public 이라 해시도 평문도 공개돼
 * 있었고, 따라서 이 코드로 배포된 모든 시스템이 <b>공개된 관리자 비밀번호를 가진 채</b> 기동했다.
 * 2026-08-01 에 그 해시를 classpath:db/seed-dev 로 <b>이설</b>하고(dev/local/e2e 프로파일과
 * 개발용 compose 에서만 적재), 운영 시드에는 어떤 입력과도 매칭되지 않는 sentinel
 * ({@code '{disabled}NO-LOGIN-PASSWORD-NOT-PROVISIONED'})만 남겼다. 운영 최초 비밀번호는
 * {@code AdminPasswordProvisioner}(ADMIN_INITIAL_PASSWORD)가 기동 시 1회 주입한다.
 *
 * <p>이 봉합은 <b>3개 파일에 걸쳐 있고 어느 하나만 되돌려도 조용히 무너진다</b> — 해시를 다시
 * 마이그레이션에 넣거나, seed-dev 파일을 migration 으로 되돌리거나, 운영 flyway locations 에
 * seed-dev 를 추가하기만 하면 된다. 그래서 기계 게이트로 못박는다(GEMINI.md §0.7-H5).
 *
 * <p>[규칙] 아래 셋 중 하나라도 어기면 위반이다.
 * <ol>
 *   <li><b>해시 유입</b> — db/migration 하위 {@code .sql} 의 <b>주석이 아닌</b> 라인에 비밀번호
 *       인코더 id(bcrypt/noop/pbkdf2/scrypt/argon2/sha256/md5 중괄호 접두)나 modular-crypt
 *       bcrypt 해시(달러 2a/2b/2x/2y 달러 코스트 달러) 리터럴이 등장.
 *       ※ 설명 주석에는 'bcrypt' 라는 <b>단어</b>가 정당하게 등장하므로(R__seed_framework.sql,
 *       R__seed_demo.sql) 주석 라인은 제외한다.</li>
 *   <li><b>이설 원복</b> — db/seed-dev 디렉터리 또는 그 안의 {@code .sql} 이 사라짐.
 *       <b>양성 대조군</b>도 함께 검사한다: 그 위치에는 해시가 <b>있어야</b> 정상이며, 0건이면
 *       탐지 정규식이 무력화됐거나(→ 규칙①이 vacuous) 개발 시드가 소실된 것이다.</li>
 *   <li><b>운영 locations 오염</b> — application.yml / application-prod.yml 의 주석 아닌 라인이
 *       {@code seed-dev} 를 언급(= 운영 기본값이 개발 시드를 먹음). base 는 flyway
 *       {@code locations} 를 <b>명시 선언</b>해야 한다(암묵 기본값 의존은 이 검사를 vacuous 하게 만든다).</li>
 * </ol>
 *
 * <p><b>예외 목록을 두지 않는다</b>(§0.7-H2). 2026-08-01 실측으로 db/migration 의 {@code .sql}
 * 36개 전수에 해시 리터럴이 0건임을 확인했으므로 동결해야 할 기존 위반이 존재하지 않는다
 * (V2_0__baseline.sql 은 pg_dump 스냅샷이라 {@code pswd} <i>컬럼 정의/주석</i>만 있고 값은 없다).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 텍스트 스캔. 마이그레이션 경로 해석은
 * {@link SchemaNamingLinterTest#resolveMigrationDir()} 로 일원화한다(P4 게이트 무결성 관행).
 */
class SeedLocationLinterTest {

    private static final Logger log = LoggerFactory.getLogger(SeedLocationLinterTest.class);

    /** 개발 전용 시드 위치의 디렉터리명. 운영 flyway locations 에 절대 나타나면 안 되는 토큰이기도 하다. */
    private static final String SEED_DEV_DIR = "seed-dev";

    /** 운영에 실제로 적용되는 설정 파일 — base 와 prod 오버레이. 여기에 seed-dev 가 들어오면 사고다. */
    private static final List<String> PRODUCTION_CONFIGS = List.of("application.yml", "application-prod.yml");

    /**
     * Spring {@code DelegatingPasswordEncoder} 의 인코더 id 접두. 시드 SQL 에 이게 있다는 것은
     * "검증 가능한 비밀번호 값"이 동봉됐다는 뜻이다. sentinel {@code {disabled}} 는 어떤 인코더에도
     * 매핑되지 않으므로(=로그인 불가) 의도적으로 목록에서 제외한다.
     */
    private static final Pattern ENCODER_ID_PREFIX = Pattern.compile(
            "(?i)\\{(?:bcrypt|noop|pbkdf2|scrypt|argon2|sha256|md5)[^}\\r\\n]{0,40}\\}");

    /** modular-crypt bcrypt 해시 본문. 인코더 id 없이 raw 해시만 심는 우회까지 잡는다. */
    private static final Pattern BCRYPT_HASH = Pattern.compile("\\$2[abxy]\\$[0-9]{2}\\$");

    /** yml 의 flyway {@code locations} 선언 라인(주석 제거 후 라인 단위 적용). */
    private static final Pattern FLYWAY_LOCATIONS = Pattern.compile("^\\s*locations\\s*:\\s*(\\S.*)$");

    /**
     * [vacuity 하한] db/migration 의 {@code .sql} 실측 36개(2026-08-01). 파일 이동·경로 파손으로
     * 스캔이 조용히 붕괴하면 규칙①이 vacuous 통과가 되므로, 여유를 둔 25 미만이면 게이트 파손으로 처리한다.
     */
    private static final int MIGRATION_SQL_FLOOR = 25;

    @Test
    @DisplayName("🔐 알려진 자격증명 재유입 차단 — db/migration 해시 0 + seed-dev 이설 유지 + 운영 locations 청결 (W0-02)")
    void auditSeedCredentialLocation() throws IOException {
        Path migrationDir = SchemaNamingLinterTest.resolveMigrationDir();
        Path resourcesDir = migrationDir.getParent().getParent(); // .../src/main/resources
        Path seedDevDir = resourcesDir.resolve("db").resolve(SEED_DEV_DIR);

        List<String> violations = new ArrayList<>();

        // ── ① db/migration 전수 스캔: 자격증명 해시 리터럴 0건 ─────────────────────────────
        List<Path> migrationSql = collectSql(migrationDir);
        if (migrationSql.size() < MIGRATION_SQL_FLOOR) {
            fail("게이트 무결성 파손: db/migration 의 .sql 스캔(" + migrationSql.size() + ")이 예상 하한("
                    + MIGRATION_SQL_FLOOR + ") 미만 — 경로/스캔 파손 의심 (dir=" + migrationDir.toAbsolutePath()
                    + ", workingDir=" + Paths.get("").toAbsolutePath() + "). 조용한 skip 은 false-green 입니다.");
        }
        for (Path sql : migrationSql) {
            violations.addAll(findCredentialHits(sql, "db/migration"));
        }

        // ── ② 이설 유지 + 양성 대조군(탐지 정규식이 살아있음을 증명) ──────────────────────
        if (!Files.isDirectory(seedDevDir)) {
            violations.add("이설 원복 — 개발 전용 시드 디렉터리가 없습니다: " + seedDevDir.toAbsolutePath()
                    + " (자격증명이 db/migration 으로 되돌아갔을 가능성)");
        } else {
            List<Path> seedDevSql = collectSql(seedDevDir);
            if (seedDevSql.isEmpty()) {
                violations.add("이설 원복 — db/" + SEED_DEV_DIR + " 에 .sql 이 0건입니다: " + seedDevDir.toAbsolutePath());
            } else {
                int control = 0;
                for (Path sql : seedDevSql) {
                    control += findCredentialHits(sql, "db/" + SEED_DEV_DIR).size();
                }
                if (control == 0) {
                    violations.add("양성 대조군 실패 — db/" + SEED_DEV_DIR + " 의 .sql " + seedDevSql.size()
                            + "개에서 자격증명 해시가 1건도 검출되지 않았습니다. 개발 시드가 소실됐거나"
                            + " 탐지 정규식(ENCODER_ID_PREFIX/BCRYPT_HASH)이 무력화된 것이며, 후자라면 규칙①이"
                            + " vacuous 통과 상태입니다.");
                }
            }
        }

        // ── ③ 운영 설정의 flyway locations 청결 ────────────────────────────────────────
        Path baseYml = resourcesDir.resolve(PRODUCTION_CONFIGS.get(0));
        if (!Files.isRegularFile(baseYml)) {
            fail("게이트 무결성 파손: base 설정 파일을 찾을 수 없습니다 — " + baseYml.toAbsolutePath());
        }
        for (String cfg : PRODUCTION_CONFIGS) {
            Path yml = resourcesDir.resolve(cfg);
            if (!Files.isRegularFile(yml)) {
                log.info("[SeedLocationLinter] 운영 설정 파일 부재로 검사 생략(구성상 가능): {}", cfg);
                continue;
            }
            violations.addAll(auditProductionConfig(yml, cfg));
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔐 [SEED LOCATION LINTER] 알려진 자격증명이 운영 경로로 재유입되었습니다! (W0-02)\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 이 저장소는 public 입니다 — db/migration 에 들어간 해시는 곧바로 공개 자격증명이 되고,\n");
            sb.append("   이 코드로 배포된 모든 시스템이 같은 관리자 비밀번호를 갖게 됩니다.\n");
            sb.append("💡 조치: 알려진 비밀번호는 classpath:db/").append(SEED_DEV_DIR)
              .append(" 에만 두십시오(dev/local/e2e 프로파일 전용).\n");
            sb.append("   운영 시드는 매칭 불가 sentinel 을 넣고, 최초 비밀번호는 ADMIN_INITIAL_PASSWORD\n");
            sb.append("   (AdminPasswordProvisioner)로 주입합니다. 참고: db/migration/R__seed_framework.sql 주석.\n");
            fail(sb.toString());
        } else {
            log.info("✅ 자격증명 이설 유지 — db/migration .sql {}개에 해시 0건, db/{} 분리 유지, 운영 locations 청결(W0-02).",
                    migrationSql.size(), SEED_DEV_DIR);
        }
    }

    // ---- 검사 구현 -----------------------------------------------------------------

    /**
     * SQL 한 파일에서 자격증명 해시 리터럴을 찾는다. 블록 주석은 라인 구조를 보존한 채 비우고,
     * <b>'--' 로 시작하는 주석 라인은 통째로 제외</b>한다 — 설명 주석은 'bcrypt' 라는 단어를
     * 정당하게 인용하기 때문이다. (라인 중간의 '--' 는 문자열 리터럴 안일 수 있어 자르지 않는다:
     * 잘랐다가 뒤따르는 해시를 놓치는 false-negative 가 오탐보다 위험하다.)
     */
    private static List<String> findCredentialHits(Path sql, String area) throws IOException {
        String[] lines = blankBlockComments(Files.readString(sql, StandardCharsets.UTF_8)).split("\r?\n", -1);
        List<String> hits = new ArrayList<>();
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line.trim().startsWith("--")) {
                continue;
            }
            String masked = firstMatchMasked(line);
            if (masked != null) {
                hits.add(String.format("[%s/%s:%d] 자격증명 해시 리터럴 검출 — '%s'",
                        area, sql.getFileName(), i + 1, masked));
            }
        }
        return hits;
    }

    /** 매칭된 토큰을 앞 10자만 남겨 반환(로그로 비밀값 전문을 흘리지 않기 위함). 미매칭이면 null. */
    private static String firstMatchMasked(String line) {
        Matcher id = ENCODER_ID_PREFIX.matcher(line);
        if (id.find()) {
            return mask(id.group());
        }
        Matcher hash = BCRYPT_HASH.matcher(line);
        if (hash.find()) {
            return mask(hash.group());
        }
        return null;
    }

    private static String mask(String token) {
        return token.length() <= 10 ? token + "…" : token.substring(0, 10) + "…";
    }

    /** 운영 설정 yml 검사: 주석 아닌 라인의 seed-dev 언급 금지 + base 의 locations 명시 선언 요구. */
    private static List<String> auditProductionConfig(Path yml, String cfg) throws IOException {
        String[] lines = Files.readString(yml, StandardCharsets.UTF_8).split("\r?\n", -1);
        List<String> found = new ArrayList<>();
        int locationsDeclared = 0;

        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            if (raw.trim().startsWith("#")) {
                continue;
            }
            String code = stripInlineYamlComment(raw);
            if (code.contains(SEED_DEV_DIR)) {
                violationAdd(found, cfg, i + 1, code.trim());
            }
            if (FLYWAY_LOCATIONS.matcher(code).find()) {
                locationsDeclared++;
            }
        }

        // base 만 명시 선언을 요구한다. prod 오버레이는 base 를 상속하므로 미선언이 정상이다.
        if (cfg.equals(PRODUCTION_CONFIGS.get(0)) && locationsDeclared == 0) {
            found.add("[" + cfg + "] flyway 'locations' 명시 선언이 없습니다 — 운영 기본값이 암묵 기본값에"
                    + " 의존하면 이 게이트가 vacuous 해집니다. 'locations: classpath:db/migration' 을 유지하십시오.");
        }
        return found;
    }

    private static void violationAdd(List<String> found, String cfg, int lineNo, String code) {
        found.add(String.format("[%s:%d] 운영 설정이 개발 시드 위치를 참조합니다 — '%s'"
                + " (운영 flyway locations 는 classpath:db/migration 단독이어야 합니다)", cfg, lineNo, code));
    }

    // ---- 유틸 ----------------------------------------------------------------------

    private static List<Path> collectSql(Path dir) throws IOException {
        List<Path> result = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(dir)) {
            paths.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".sql"))
                    .sorted()
                    .forEach(result::add);
        }
        return result;
    }

    /** 블록 주석을 비우되 내부 개행은 남겨 라인 번호를 보존한다(정규식 치환은 라인 번호를 어긋나게 한다). */
    private static String blankBlockComments(String raw) {
        StringBuilder out = new StringBuilder(raw.length());
        int i = 0;
        while (i < raw.length()) {
            if (raw.charAt(i) == '/' && i + 1 < raw.length() && raw.charAt(i + 1) == '*') {
                int close = raw.indexOf("*/", i + 2);
                int end = (close < 0) ? raw.length() : close + 2;
                for (int j = i; j < end; j++) {
                    if (raw.charAt(j) == '\n') {
                        out.append('\n');
                    }
                }
                i = end;
                continue;
            }
            out.append(raw.charAt(i));
            i++;
        }
        return out.toString();
    }

    /** yml 라인 끝 주석 제거. 값 안의 '#' 오절단을 피하려 <b>공백 뒤의 '#'</b> 만 주석으로 본다. */
    private static String stripInlineYamlComment(String line) {
        int idx = line.indexOf(" #");
        return idx >= 0 ? line.substring(0, idx) : line;
    }
}
