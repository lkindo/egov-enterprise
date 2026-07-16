package nuri.foundation.core.config;

import javax.sql.DataSource;
import nuri.foundation.constants.Constants;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * 시스템 관리 모듈의 ID 생성 서비스 설정
 * 공통 컴포넌트의 EgovTableIdGnrServiceImpl을 사용하여 각 테이블별 고유 ID를 생성함.
 *
 * @since 2026-01-05
 */
@Configuration
public class EgovIdGnrConfig {
    private final DataSource dataSource;

    public EgovIdGnrConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ========== 휴일 관리 ID 생성 (sym.cal) ==========
    @Bean(name = "egovRestDeIdGnrService")
    public EgovIdGnrService egovRestDeIdGnrService() {
        return createIdGnrService("RESTDE_ID", "RESTDE_", 10);
    }

    // ========== 시스템 로그 관리 ID 생성 (sym.log) ==========
    @Bean(name = "egovSysLogIdGnrService")
    public EgovIdGnrService egovSysLogIdGnrService() {
        return createIdGnrService("SYS_LOG_ID", "SLOG_", 10);
    }

    @Bean(name = "egovLoginLogIdGnrService")
    public EgovIdGnrService egovLoginLogIdGnrService() {
        return createIdGnrService("LOGIN_LOG_ID", "LLOG_", 10);
    }

    @Bean(name = "egovWebLogIdGnrService")
    public EgovIdGnrService egovWebLogIdGnrService() {
        return createIdGnrService("WEB_LOG_ID", "WLOG_", 10);
    }

    @Bean(name = "egovTrsmrcvLogIdGnrService")
    public EgovIdGnrService egovTrsmrcvLogIdGnrService() {
        return createIdGnrService("TRSMRCV_LOG_ID", "TLOG_", 10);
    }

    // ========== 사용자 확인 ID 생성 (uss.umt) ==========
    @Bean(name = "egovUsrCnfrmIdGnrService")
    public EgovIdGnrService egovUsrCnfrmIdGnrService() {
        return createIdGnrService("USRCNFRM_ID", Constants.User.USRCNFRM_PREFIX, 20);
    }

    // ========== ID 생성 헬퍼 메소드 ==========
    private EgovIdGnrService createIdGnrService(String tableName, String prefix, int cipers) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setBlockSize(10);
        idGnrService.setTable("ecopseq");
        idGnrService.setTableName(tableName);
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix(prefix);
        strategy.setCipers(cipers);
        strategy.setFillChar('0');
        idGnrService.setStrategy(strategy);
        return idGnrService;
    }

    // ========== 추가 ID 생성 서비스 (중앙 집중형) ==========
    @Primary
    @Bean(name = "egovFileIdGnrService")
    public EgovIdGnrService egovFileIdGnrService() {
        return createIdGnrService("ids", "FILE_", 15);
    }

    @Bean(name = "egovBBSMstrIdGnrService")
    public EgovIdGnrService egovBBSMstrIdGnrService() {
        return createIdGnrService("ids", "BBSMSTR_", 12);
    }

    @Bean(name = "egovAdbkIdGnrService")
    public EgovIdGnrService egovAdbkIdGnrService() {
        return createIdGnrService("ids", "ADBK_", 15);
    }

    @Bean(name = "egovAdbkUserIdGnrService")
    public EgovIdGnrService egovAdbkUserIdGnrService() {
        return createIdGnrService("ids", "ADBKUSER_", 11);
    }

    @Bean(name = "egovCmmntyIdGnrService")
    public EgovIdGnrService egovCmmntyIdGnrService() {
        return createIdGnrService("CMMNTY_ID", "CMMNTY_", 13);
    }

    @Bean(name = "egovMenuManageIdGnrService")
    public EgovIdGnrService egovMenuManageIdGnrService() {
        return createIdGnrService("MENU_ID", "MENU_", 10);
    }

    @Bean(name = "egovTroblIdGnrService")
    public EgovIdGnrService egovTroblIdGnrService() {
        return createIdGnrService("TROBL_ID", "TROBL_", 10);
    }

    @Bean(name = "reprtStatsIdGnrService")
    public EgovIdGnrService reprtStatsIdGnrService() {
        return createIdGnrService("REPRT_STATS_ID", "REPRT_", 10);
    }
}
