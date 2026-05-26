package nuri.business.service.mail;

import nuri.TestApplication;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.foundation.security.config.TestSecurityConfig;
import nuri.foundation.core.config.TestMessagingConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * DB 무중단 마이그레이션(Expand-and-Contract) 하위 호환성 정밀 검증 통합 테스트
 * - DB 헌법 제4조 및 6대 Non-E2E 검증 수칙에 의거하여 작성되었습니다.
 * - 신규 컬럼 DDL 마이그레이션이 이미 수행된 환경(Expand Phase)에서도, 신규 컬럼을 인식하지 못하는 구버전 서버 엔티티(V1)가
 *   JPA 매핑 오류나 데이터 삽입 예외 없이 정상적으로 DB 읽기/쓰기를 완수하는지 정밀 실증합니다.
 */
@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@ActiveProfiles("test")
@Transactional
class SchemaMigrationCompatibilityTest {

    @Autowired
    private SentMailRepository sentMailRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String testMssageId;
    private boolean columnAdded = false;

    @AfterEach
    void tearDown() {
        // 1. 임시 테스트 데이터 소거
        if (testMssageId != null) {
            sentMailRepository.deleteById(testMssageId);
        }

        // 2. Expand Phase 시뮬레이션용 임시 컬럼 원복 (Contract)
        if (columnAdded) {
            try {
                jdbcTemplate.execute("ALTER TABLE tb_email_dsptch_manage DROP COLUMN IF EXISTS temp_migration_col");
            } catch (Exception e) {
                System.err.println("테스트 클린업 임시 컬럼 제거 실패: " + e.getMessage());
            }
        }
    }

    @Test
    @DisplayName("무중단 마이그레이션 검증 - 신규 컬럼(Expand) 추가 후에도 구버전 서버 엔티티의 조회/쓰기가 정상 작동함을 보증")
    void database_expandPhase_backwardCompatibility_verified() {
        // Given: 1. DB 스키마 신규 확장 (Expand Phase 시뮬레이션)
        // 실제 마이그레이션에 의해 'temp_migration_col' 이라는 신규 컬럼이 물리 테이블에 동적으로 추가됨
        assertDoesNotThrow(() -> {
            jdbcTemplate.execute("ALTER TABLE tb_email_dsptch_manage ADD COLUMN temp_migration_col VARCHAR(100) DEFAULT 'default_val'");
            columnAdded = true;
        }, "물리 테이블에 신규 마이그레이션 컬럼 추가 시 예외가 없어야 합니다.");

        // Given: 2. 구버전 서버 엔티티(V1) 상태의 모의 데이터 준비
        // 이 엔티티는 신규 추가된 'temp_migration_col' 컬럼을 전혀 매핑하지 않고 모르는 상태임 (구버전 인스턴스)
        testMssageId = "MSG_M_" + UUID.randomUUID().toString().substring(0, 8);
        SentMail legacyMail = SentMail.builder()
                .mssageId(testMssageId)
                .sndngResultCode("S")
                .sj("무중단 배포 호환성 테스트")
                .emailCn("구버전 서버에서 신버전 DB 스키마로 데이터 입출력을 테스트합니다.")
                .dsptchPerson("admin@egov.com")
                .recptnPerson("user@egov.com")
                .sndngDe(LocalDateTime.now())
                .build();

        // When & Then: 3. 구버전 엔티티를 통한 쓰기(Insert/Save)가 예외 없이 완벽하게 수행되는지 검증
        assertDoesNotThrow(() -> {
            sentMailRepository.saveAndFlush(legacyMail);
        }, "신규 컬럼이 존재하는 DB 스키마 환경에서 구버전 엔티티의 JPA 저장은 절대로 뻗지 않아야 합니다.");

        // When & Then: 4. 구버전 엔티티를 통한 조회(Select/Find)가 널 포인터나 타입 매치 예외 없이 복원되는지 검증
        assertDoesNotThrow(() -> {
            SentMail retrievedMail = sentMailRepository.findById(testMssageId)
                    .orElseThrow(() -> new AssertionError("저장된 메일 데이터를 찾을 수 없습니다."));
            
            // 기존 매핑된 속성들의 완벽한 복원 여부 단언
            assertThat(retrievedMail.getSj()).isEqualTo("무중단 배포 호환성 테스트");
            assertThat(retrievedMail.getSndngResultCode()).isEqualTo("S");
        }, "신규 컬럼이 추가된 DB 상태에서도 구버전 필드의 데이터 조회는 무결하게 이루어져야 합니다.");

        // Then: 5. 신규 컬럼에도 정상적으로 DEFAULT 설정 혹은 NULL 허용 기본값이 인가되었는지 원시 JDBC로 대조 확인
        String dbValue = jdbcTemplate.queryForObject(
                "SELECT temp_migration_col FROM tb_email_dsptch_manage WHERE msg_id = ?",
                String.class,
                testMssageId
        );
        assertThat(dbValue).isEqualTo("default_val");
    }
}
