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
 */
class ZeroDowntimeMigrationLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ZeroDowntimeMigrationLinterTest.class);
    private static final String MIGRATION_PATH = "src/main/resources/db/migration";

    // ====================================================================================
    // 무중단 4단계 이행(Expand-and-Contract) 위반 안티패턴 정규식 정의
    // ====================================================================================
    
    // 1. DROP COLUMN (COLUMN 생략형 포함, CONSTRAINT 삭제는 허용)
    private static final Pattern FORBIDDEN_DROP = Pattern.compile("(?is)\\bALTER\\s+TABLE\\s+\\S+\\s+DROP\\s+(?:COLUMN\\s+)?(?!CONSTRAINT\\b)\\w+");

    // 2. ALTER TYPE (COLUMN 생략형 포함)
    private static final Pattern FORBIDDEN_ALTER_TYPE = Pattern.compile("(?is)\\bALTER\\s+TABLE\\s+\\S+\\s+ALTER\\s+(?:COLUMN\\s+)?\\S+\\s+TYPE\\s+");

    // 3. RENAME COLUMN (COLUMN 생략형 포함)
    private static final Pattern FORBIDDEN_RENAME = Pattern.compile("(?is)\\bALTER\\s+TABLE\\s+\\S+\\s+RENAME\\s+(?:COLUMN\\s+)?");

    // 4. ADD COLUMN ... NOT NULL without DEFAULT 문맥 파서 정규식
    private static final Pattern ADD_CLAUSE_PATTERN = Pattern.compile("(?is)\\bADD\\s+(?:COLUMN\\s+)?(.*?)(?:,|$|;)");

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

                         // 화이트리스트: 파일 전체 무시 플래그 확인
                         if (content.contains("-- linter:disable-file")) {
                             log.info("⏩ File [{}] is skipped by linter:disable-file directive.", path.getFileName());
                             return;
                         }

                         // 정밀한 주석 제거
                         // 1. (?s) 플래그를 추가하여 멀티라인 /* ... */ 주석 완벽 소거
                         // 2. 단일행 -- 주석 제거 시 라인엔드(\r\n) 보존
                         String cleanContent = content
                                 .replaceAll("(?s)/\\*.*?\\*/", "")
                                 .replaceAll("--[^\r\n]*", "");

                         String fileName = path.getFileName().toString();

                         // 1~3번 규칙 검사 (화이트리스트 라인 무시 기능 적용)
                         checkViolationWithIgnore(fileName, cleanContent, FORBIDDEN_DROP, 
                                 "DROP COLUMN은 하위 호환성을 파괴합니다. 무중단 4단계 이행(Contract) 최종 배포 주기에만 '-- linter:ignore'와 함께 수행하십시오.", violations);
                          
                         checkViolationWithIgnore(fileName, cleanContent, FORBIDDEN_ALTER_TYPE, 
                                 "ALTER COLUMN TYPE은 테이블 Lock을 유발합니다. 신규 컬럼 생성(Expand) 후 백그라운드 데이터 복제를 수행하십시오.", violations);

                         checkViolationWithIgnore(fileName, cleanContent, FORBIDDEN_RENAME, 
                                 "RENAME COLUMN은 구버전 앱의 SELECT/INSERT 쿼리를 즉각 파괴합니다. 듀얼 라이팅을 수행하십시오.", violations);

                         // 4번 규칙 검사 (ADD NOT NULL without DEFAULT 문맥 파싱)
                         checkAddNotNullViolation(fileName, cleanContent, violations);

                     } catch (IOException e) {
                         fail("Failed to read migration file: " + path);
                     }
                 });
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🚨 [ZERO-DOWNTIME LINTER] 파괴적 DDL 스크립트가 배포 전 최종 검증 단계에서 차단되었습니다!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 조치방법: 'docs/02-architecture/zero-downtime-migration.md'를 참고하여 DDL을 변경하십시오.");
            sb.append("\n💡 긴급상황 또는 4단계(Contract) 릴리즈 시, 위반 라인 끝에 '-- linter:ignore' 주석을 달아 예외처리 하십시오.\n");
            
            fail(sb.toString());
        } else {
            log.info("✅ 모든 Flyway 스크립트가 무중단 배포(Zero-Downtime) 규격을 완벽히 준수합니다.");
        }
    }

    private void checkViolationWithIgnore(String fileName, String content, Pattern pattern, String errorMessage, List<String> violations) {
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String matchedStatement = matcher.group(0);
            
            // 검출된 문장 바로 뒷부분이나 매칭 라인에 ignore 지시어가 있는지 확인
            int matchStart = matcher.start();
            int lineEnd = content.indexOf("\n", matchStart);
            String targetLine = (lineEnd != -1) ? content.substring(matchStart, lineEnd) : matchedStatement;
            
            if (targetLine.contains("linter:ignore")) {
                continue; // 화이트리스트 통과
            }

            violations.add(String.format("File [%s]: %s\n   -> 감지된 구문: '%s'", 
                    fileName, errorMessage, matchedStatement.trim().replaceAll("\\s+", " ")));
        }
    }

    private void checkAddNotNullViolation(String fileName, String content, List<String> violations) {
        Matcher matcher = ADD_CLAUSE_PATTERN.matcher(content);
        while (matcher.find()) {
            String addClause = matcher.group(1);
            String upperClause = addClause.toUpperCase();
            
            // NOT NULL이면서 DEFAULT 키워드가 없는 경우 차단
            if (upperClause.contains("NOT") && upperClause.contains("NULL") && !upperClause.contains("DEFAULT")) {
                
                // 해당 매칭 라인에 ignore 지시어가 있다면 통과
                int matchStart = matcher.start();
                int lineEnd = content.indexOf("\n", matchStart);
                String targetLine = (lineEnd != -1) ? content.substring(matchStart, lineEnd) : addClause;

                if (targetLine.contains("linter:ignore")) {
                    continue;
                }

                violations.add(String.format("File [%s]: DEFAULT 값 없는 NOT NULL 컬럼 추가는 구버전 앱의 INSERT를 즉각 파괴합니다.\n" +
                        "   -> 감지된 구문: 'ADD %s'\n" +
                        "   -> 해결책: DEFAULT 값을 추가하거나, NULL 허용 컬럼으로 만든 뒤 수작업 백필(Backfill)을 거치십시오.", 
                        fileName, addClause.trim().replaceAll("\\s+", " ")));
            }
        }
    }
}
