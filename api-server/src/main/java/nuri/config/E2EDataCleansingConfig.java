package nuri.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.annotation.PostConstruct;
import org.springframework.transaction.annotation.Transactional;

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

    @PostConstruct
    @Transactional
    public void cleanseTestData() {
        log.info(">>> Starting E2E Test Data Cleansing...");

        try {
            // 1. 게시판 게시글 소프트 삭제 (NBBS) - Board.delete()는 USE_AT='N'으로 소프트 삭제
            //    E2E 테스트 패턴: 'E2E %' (Poll, Popup, Banner, FAQ 등)
            int bbsSoftCount = jdbcTemplate.update(
                "UPDATE NBBS SET USE_AT = 'N' WHERE NTT_SJ LIKE 'E2E %' OR FRST_REGISTER_ID = 'E2E_USER'"
            );
            log.info(">>> Soft-deleted {} board articles.", bbsSoftCount);

            // 2. 설문 데이터 삭제 (NONLINEPOLLMANAGE + CASCADE 항목)
            //    OnlinePollManage는 @OneToMany(cascade = CascadeType.ALL) 이므로
            //    하위 항목(NONLINEPOLLITEM) 삭제가 자동 처리됨
            //    단, JDBC 레벨에서는 수동으로 자식 테이블부터 삭제
            int pollItemCount = jdbcTemplate.update(
                "DELETE FROM NONLINEPOLLITEM WHERE POLL_ID IN (" +
                "  SELECT POLL_ID FROM NONLINEPOLLMANAGE WHERE POLL_NM LIKE 'E2E %' OR FRST_REGISTER_ID = 'E2E_USER'" +
                ")"
            );
            log.info(">>> Cleaned {} poll items.", pollItemCount);

            int pollCount = jdbcTemplate.update(
                "DELETE FROM NONLINEPOLLMANAGE WHERE POLL_NM LIKE 'E2E %' OR FRST_REGISTER_ID = 'E2E_USER'"
            );
            log.info(">>> Cleaned {} online polls.", pollCount);

            // 3. 팝업 데이터 삭제 (NPOPUPMANAGE)
            //    E2E 테스트 패턴: 'E2E Popup %'
            int popupCount = jdbcTemplate.update(
                "DELETE FROM NPOPUPMANAGE WHERE POPUP_SJ_NM LIKE 'E2E %' OR FRST_REGISTER_ID = 'E2E_USER'"
            );
            log.info(">>> Cleaned {} popups.", popupCount);

            // 4. 배너 데이터 삭제 (NBANNER)
            //    E2E 테스트 패턴: 'E2E Banner %'
            int bannerCount = jdbcTemplate.update(
                "DELETE FROM NBANNER WHERE BANNER_NM LIKE 'E2E %' OR FRST_REGISTER_ID = 'E2E_USER'"
            );
            log.info(">>> Cleaned {} banners.", bannerCount);

            log.info(">>> E2E Test Data Cleansing Completed. board={}, pollItem={}, poll={}, popup={}, banner={}",
                bbsSoftCount, pollItemCount, pollCount, popupCount, bannerCount);
        } catch (Exception e) {
            log.error(">>> Error during E2E data cleansing: {}", e.getMessage(), e);
        }
    }
}
