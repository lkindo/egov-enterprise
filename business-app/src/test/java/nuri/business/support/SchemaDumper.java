package nuri.business.support;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.io.BufferedWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * JPA 엔티티 정보를 기반으로 무결한 H2-PostgreSQL DDL 마이그레이션 스크립트를 생성하고,
 * H2 고유의 불순물 설정 쿼리를 정규식(Regex)으로 정밀 필터링하여 순수 DDL 구조만 추출하는 고성능 유틸리티 하네스.
 *
 * <p><b>[동기화 주의 — 파생 사본]</b> 본 클래스는
 * {@code business-core/src/test/java/nuri/business/support/SchemaDumper.java}(정본)와 <b>바이트 동일한 복제본</b>이다.
 * 두 모듈의 {@code test} 소스셋은 서로를 볼 수 없고(모듈 간 test 소스는 Gradle 기본 비공유, 상호
 * {@code testImplementation testFixtures(...)} 의존도 없음), 이 클래스는 {@code testFixtures} 가 아닌
 * {@code test} 소스셋에 있어 현 빌드 구성으로는 공유가 불가능하다. 따라서 중복은 build.gradle 변경 없이는 해소되지 않는다.
 * <b>한쪽을 고치면 반드시 다른 쪽도 동일하게 고쳐라.</b>
 * 문서({@code docs/03-guides/testing-guide.md})는 business-core 사본을 정본으로 명시한다.
 * 근본 해소책: 본 클래스를 공용 {@code testFixtures} 로 승격하고 소비 모듈에 testFixtures 의존을 추가 → 사본 1개로 통합.
 */
@SpringBootTest
@ActiveProfiles("test-dump")
@Disabled("스키마 물리 명세를 동기화(덤프)할 때만 선택적으로 켜서 수동 실행합니다. 로컬/CI 평시 빌드에서는 제외합니다.")
public class SchemaDumper {

    @Autowired
    private DataSource dataSource;

    private static final Path OUTPUT_PATH = Paths.get("src/test/resources/db/migration/V1__init_test_schema.sql");

    // 건너뛸 H2 전용 비표준 구문 정규식 패턴 정의
    private static final List<Pattern> IGNORE_PATTERNS = List.of(
            Pattern.compile("^SET\\s+.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^CREATE\\s+USER\\s+.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^CREATE\\s+SCHEMA\\s+IF\\s+NOT\\s+EXISTS\\s+.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^ALTER\\s+SYSTEM\\s+.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^INSERT\\s+INTO\\s+(SYSTEM_LOB_STREAM|SYSTEM_LOB_STREAMS|SYSTEM_LOBS|SYSTEM_LOB_MAP).*\\s+VALUES\\s+.*", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^--\\s+.*", Pattern.CASE_INSENSITIVE), // 주석
            Pattern.compile("^\\s*$", Pattern.CASE_INSENSITIVE)       // 공백 라인
    );

    @Test
    @Disabled("스키마 물리 명세를 동기화(덤프)할 때만 선택적으로 켜서 수동 실행합니다. 로컬/CI 평시 빌드에서는 제외합니다.")
    public void dumpCleanSchema() throws Exception {
        List<String> cleanDdlLines = new ArrayList<>();

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // H2 SCRIPT 명령을 쿼리 형태로 실행하여 ResultSet으로 DDL 문자열을 로딩
            try (ResultSet rs = stmt.executeQuery("SCRIPT NOPASSWORDS")) {
                while (rs.next()) {
                    String rawLine = rs.getString(1);
                    if (rawLine == null) continue;

                    String trimmed = rawLine.trim();

                    // 1. 건너뛸 구문 필터링
                    boolean ignore = false;
                    for (Pattern p : IGNORE_PATTERNS) {
                        if (p.matcher(trimmed).matches()) {
                            ignore = true;
                            break;
                        }
                    }
                    if (ignore) continue;

                    // 2. H2 고유의 PUBLIC. 스키마 한정자 제거 및 MEMORY 키워드 순수화
                    String processed = rawLine;
                    
                    // 'CREATE MEMORY TABLE PUBLIC.TABLE_NAME' -> 'CREATE TABLE TABLE_NAME'
                    processed = processed.replaceAll("(?i)CREATE\\s+MEMORY\\s+TABLE\\s+PUBLIC\\.", "CREATE TABLE ");
                    processed = processed.replaceAll("(?i)CREATE\\s+MEMORY\\s+TABLE\\s+", "CREATE TABLE ");
                    
                    // 'CREATE TABLE PUBLIC.TABLE_NAME' -> 'CREATE TABLE TABLE_NAME'
                    processed = processed.replaceAll("(?i)CREATE\\s+TABLE\\s+PUBLIC\\.", "CREATE TABLE ");
                    
                    // 'ALTER TABLE PUBLIC.TABLE_NAME' -> 'ALTER TABLE TABLE_NAME'
                    processed = processed.replaceAll("(?i)ALTER\\s+TABLE\\s+PUBLIC\\.", "ALTER TABLE ");
                    
                    // 'REFERENCES PUBLIC.TABLE_NAME' -> 'REFERENCES TABLE_NAME'
                    processed = processed.replaceAll("(?i)REFERENCES\\s+PUBLIC\\.", "REFERENCES ");
                    
                    // 'CREATE INDEX PUBLIC.INDEX_NAME' -> 'CREATE INDEX INDEX_NAME'
                    processed = processed.replaceAll("(?i)CREATE\\s+INDEX\\s+PUBLIC\\.", "CREATE INDEX ");
                    
                    // 테이블 명세 등에서 PUBLIC. 접두사가 남는 경우 최종 제거
                    processed = processed.replaceAll("(?i)\\bPUBLIC\\.", "");

                    cleanDdlLines.add(processed);
                }
            }
        }

        // 출력 디렉토리 존재 여부 보장
        Files.createDirectories(OUTPUT_PATH.getParent());

        // 깨끗하게 정제된 DDL 파일 영구 저장
        try (BufferedWriter writer = Files.newBufferedWriter(OUTPUT_PATH)) {
            writer.write("-- ==========================================================================\n");
            writer.write("-- eGov Enterprise Local Test Database Schema (PostgreSQL-Mode Clean DDL)\n");
            writer.write("-- Automatically generated by SchemaDumper and refined by Antigravity Post-processor.\n");
            writer.write("-- ==========================================================================\n\n");

            for (String line : cleanDdlLines) {
                writer.write(line);
                writer.write("\n");
            }
        }

        System.out.println("✅ [SchemaDumper] Clean PostgreSQL-Mode DDL has been successfully dumped to: " + OUTPUT_PATH.toAbsolutePath());
    }
}
