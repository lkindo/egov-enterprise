package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
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
 * 🚨 Zero-Downtime Migration Safety Linter
 * 무중단 배포를 위한 데이터베이스 DDL 정적 분석 하네스
 * 
 * 데이터베이스 마이그레이션(Flyway) 스크립트에 테이블 락(Lock)을 유발하거나
 * 하위 호환성(Backward Compatibility)을 파괴하는 DDL 구문이 포함되어 있는지
 * 빌드/테스트 단계에서 강제 감지하여 배포 사고를 원천 차단합니다.
 */
class ZeroDowntimeMigrationLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ZeroDowntimeMigrationLinterTest.class);

    // DDL을 포함할 수 있는 Flyway 스크립트 경로 (api-server 모듈 내)
    private static final String MIGRATION_PATH = "src/main/resources/db/migration";

    // ====================================================================================
    // 무중단 4단계 이행(Expand-and-Contract) 위반 안티패턴 정규식 정의
    // ====================================================================================

    // 1. DROP COLUMN: 기존 서버가 해당 컬럼을 참조하고 있으면 앱이 터짐 (Expand 단계에서는 삭제 금지)
    private static final Pattern FORBIDDEN_DROP_COLUMN = Pattern.compile("(?i)\\bDROP\\s+COLUMN\\b");

    // 2. ALTER COLUMN TYPE: PostgreSQL에서 데이터 타입 변경은 테이블 Full Rewrite와 Access Exclusive Lock을 유발
    private static final Pattern FORBIDDEN_ALTER_TYPE = Pattern.compile("(?i)\\bALTER\\s+COLUMN\\b.*\\bTYPE\\b");

    // 3. RENAME COLUMN: 컬럼명을 바꾸면 이전 버전의 앱에서 발생하는 쿼리가 즉시 실패함
    private static final Pattern FORBIDDEN_RENAME_COLUMN = Pattern.compile("(?i)\\bRENAME\\s+COLUMN\\b");

    // 4. ADD COLUMN ... NOT NULL without DEFAULT: 기본값 없는 NOT NULL 컬럼 추가는 기존 앱의 INSERT를 파괴함
    // 단순 무식한 매칭이지만, ADD COLUMN 구문 내에 NOT NULL이 있고 DEFAULT 키워드가 없는 경우를 찾음
    private static final Pattern FORBIDDEN_ADD_NOT_NULL = Pattern.compile("(?i)\\bADD\\s+COLUMN\\b(?!.*\\bDEFAULT\\b).*\\bNOT\\s+NULL\\b");


    @Test
    @DisplayName("🚨 Flyway 마이그레이션 SQL 무중단 배포 DDL 규격 오딧")
    void auditZeroDowntimeMigrationScripts() throws IOException {
        Path migrationDir = Paths.get(MIGRATION_PATH);
        if (!Files.exists(migrationDir)) {
            log.warn("Migration directory not found: {}. Skipping DDL Linting.", migrationDir.toAbsolutePath());
            return;
        }

        List<String> violations = new ArrayList<>();

        try (Stream<Path> paths = Files.walk(migrationDir)) {
            paths.filter(Files::isRegularFile)
                 .filter(p -> p.toString().endsWith(".sql"))
                 .forEach(path -> {
                     try {
                         String content = Files.readString(path);
                         // SQL 주석 제거 (단순화: -- 로 시작하는 라인 무시)
                         String cleanContent = content.replaceAll("--.*", "").replaceAll("/\\*.*?\\*/", "");

                         checkViolation(path.getFileName().toString(), cleanContent, FORBIDDEN_DROP_COLUMN, 
                                 "DROP COLUMN은 하위 호환성을 파괴합니다. 무중단 4단계 이행(Contract)을 통해 별도로 제거하십시오.", violations);
                         
                         checkViolation(path.getFileName().toString(), cleanContent, FORBIDDEN_ALTER_TYPE, 
                                 "ALTER COLUMN TYPE은 테이블 Lock을 유발합니다. 새로운 컬럼을 만들고 백그라운드 데이터 복제(Expand)를 수행하십시오.", violations);

                         checkViolation(path.getFileName().toString(), cleanContent, FORBIDDEN_RENAME_COLUMN, 
                                 "RENAME COLUMN은 기존 앱의 쿼리를 파괴합니다. 새로운 이름의 컬럼을 추가하고 양방향 동기화를 수행하십시오.", violations);
                         
                         checkViolation(path.getFileName().toString(), cleanContent, FORBIDDEN_ADD_NOT_NULL, 
                                 "DEFAULT 값 없는 NOT NULL 컬럼 추가는 기존 앱의 INSERT를 실패하게 만듭니다. DEFAULT 값을 제공하거나, NULL 허용 컬럼으로 추가 후 채우십시오.", violations);

                     } catch (IOException e) {
                         fail("Failed to read migration file: " + path);
                     }
                 });
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🚨 [ZERO-DOWNTIME LINTER] 파괴적 DDL 스크립트 감지! 빌드 실패 처리!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n해결책: 문서 'docs/02-architecture/zero-downtime-migration.md'의 Expand-and-Contract 패턴을 준수하여 SQL을 수정하십시오.\n");
            
            fail(sb.toString());
        } else {
            log.info("✅ 모든 Flyway 스크립트가 무중단 배포(Zero-Downtime) 규격을 완벽히 준수합니다.");
        }
    }

    private void checkViolation(String fileName, String content, Pattern pattern, String errorMessage, List<String> violations) {
        Matcher matcher = pattern.matcher(content);
        if (matcher.find()) {
            violations.add(String.format("File [%s]: %s\n   -> 감지된 패턴: '%s'", fileName, errorMessage, matcher.group(0).trim()));
        }
    }
}
