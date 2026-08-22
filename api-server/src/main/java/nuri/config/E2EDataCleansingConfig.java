package nuri.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * E2E 테스트 데이터 클린징 설정
 * - e2e 프로필에서 서버 시작 시 실행되어 '[E2E]' 패턴이나 'E2E_USER'가 생성한 데이터를 삭제합니다.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@Profile("e2e")
public class E2EDataCleansingConfig {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    @PostConstruct
    public void cleanseTestData() {
        log.info(">>> Starting E2E Test Data Cleansing...");

        try {
            transactionTemplate.executeWithoutResult(status -> cleanseWithinTransaction());
        } catch (RuntimeException e) {
            log.error(">>> Error during E2E data cleansing: {}", e.getMessage(), e);
            throw e;
        }
    }

    private void cleanseWithinTransaction() {
        // 1. 게시판 게시글 소프트 삭제 (NBBS) - Board.delete()는 USE_AT='N'으로 소프트 삭제
        //    E2E 테스트 패턴: 'E2E %' (Poll, Popup, Banner, FAQ 등)
        int bbsSoftCount = jdbcTemplate.update(
            "UPDATE TB_BBS_ITEM SET USE_YN = 'N' WHERE PST_TTL LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'"
        );
        log.info(">>> Soft-deleted {} board articles.", bbsSoftCount);

        // 2. 설문 데이터 삭제
        //    V2_67 이후 물리 FK는 poll_sn/poll_artcl_sn이며 ON DELETE CASCADE가 아니다.
        //    JDBC 정리는 E2E 설문의 결과 -> 항목 -> 관리 행 순서로 제한해 삭제한다.
        int pollResultCount = jdbcTemplate.update(
            "DELETE FROM TB_ONLN_POLL_RSLT WHERE POLL_SN IN (" +
            "SELECT POLL_SN FROM TB_ONLN_POLL_MANAGE WHERE POLL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'" +
            ")"
        );
        log.info(">>> Cleaned {} poll results.", pollResultCount);

        int pollItemCount = jdbcTemplate.update(
            "DELETE FROM TB_ONLN_POLL_ARTCL WHERE POLL_SN IN (" +
            "SELECT POLL_SN FROM TB_ONLN_POLL_MANAGE WHERE POLL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'" +
            ")"
        );
        log.info(">>> Cleaned {} poll items.", pollItemCount);

        int pollCount = jdbcTemplate.update(
            "DELETE FROM TB_ONLN_POLL_MANAGE WHERE POLL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'"
        );
        log.info(">>> Cleaned {} online polls.", pollCount);

        // 3. 팝업 데이터 삭제 (NPOPUPMANAGE)
        //    E2E 테스트 패턴: 'E2E Popup %'
        int popupCount = jdbcTemplate.update(
            "DELETE FROM TB_POPUP_INFO WHERE POPUP_TTL_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'"
        );
        log.info(">>> Cleaned {} popups.", popupCount);

        // 4. 배너 데이터 삭제 (NBANNER)
        //    E2E 테스트 패턴: 'E2E Banner %'
        int bannerCount = jdbcTemplate.update(
            "DELETE FROM TB_BNR_INFO WHERE BNR_NM LIKE 'E2E %' OR FRST_RGTR_ID = 'E2E_USER'"
        );
        log.info(">>> Cleaned {} banners.", bannerCount);

        log.info(">>> E2E Test Data Cleansing Completed. board={}, pollResult={}, pollItem={}, poll={}, popup={}, banner={}",
            bbsSoftCount, pollResultCount, pollItemCount, pollCount, popupCount, bannerCount);
    }
}
