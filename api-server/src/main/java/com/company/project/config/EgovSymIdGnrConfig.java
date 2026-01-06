package com.company.project.config;

import javax.sql.DataSource;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.Resource;

/**
 * 시스템관리(sym) 패키지의 컨트롤러/서비스에서 필요로 하는 IdGnrService 빈들을 등록합니다.
 * 전자정부프레임워크의 EgovTableIdGnrServiceImpl을 사용하여 ID를 자동 생성합니다.
 * 
 * @since 2026-01-05
 */
@Configuration
public class EgovSymIdGnrConfig {

    @Resource(name = "dataSource")
    private DataSource dataSource;

    // ========== 배치 관리 (sym.bat) ==========

    @Bean
    public EgovIdGnrService egovBatchOpertIdGnrService() {
        return createIdGnrService("BATCH_OPERT_ID", "BATCH_", 10);
    }

    @Bean
    public EgovIdGnrService egovBatchSchdulIdGnrService() {
        return createIdGnrService("BATCH_SCHDUL_ID", "SCHDUL_", 10);
    }

    // ========== 백업 관리 (sym.sym.bak) ==========

    @Bean
    public EgovIdGnrService egovBackupOpertIdGnrService() {
        return createIdGnrService("BACKUP_OPERT_ID", "BACKUP_", 10);
    }

    // ========== 캘린더/공휴일 관리 (sym.cal) ==========

    @Bean
    public EgovIdGnrService egovRestDeIdGnrService() {
        return createIdGnrService("RESTDE_ID", "RESTDE_", 10);
    }

    // ========== 네트워크 관리 (sym.sym.nwk) ==========

    @Bean
    public EgovIdGnrService egovNtwrkIdGnrService() {
        return createIdGnrService("NTWRK_ID", "NTWRK_", 10);
    }

    // ========== 서버 관리 (sym.sym.srv) ==========

    @Bean
    public EgovIdGnrService egovServerIdGnrService() {
        return createIdGnrService("SERVER_ID", "SVR_", 10);
    }

    @Bean
    public EgovIdGnrService egovServerEqpmnIdGnrService() {
        return createIdGnrService("SERVER_EQPMN_ID", "SVREQ_", 10);
    }

    // ========== 장애 관리 (sym.tbm) ==========

    @Bean
    public EgovIdGnrService egovTroblIdGnrService() {
        return createIdGnrService("TROBL_ID", "TROBL_", 10);
    }

    // ========== 로그 관리 (sym.log) ==========

    @Bean
    public EgovIdGnrService egovSysLogIdGnrService() {
        return createIdGnrService("SYS_LOG_ID", "SLOG_", 10);
    }

    @Bean
    public EgovIdGnrService egovLoginLogIdGnrService() {
        return createIdGnrService("LOGIN_LOG_ID", "LLOG_", 10);
    }

    @Bean
    public EgovIdGnrService egovWebLogIdGnrService() {
        return createIdGnrService("WEB_LOG_ID", "WLOG_", 10);
    }

    @Bean
    public EgovIdGnrService egovTrsmrcvLogIdGnrService() {
        return createIdGnrService("TRSMRCV_LOG_ID", "TLOG_", 10);
    }

    // ========== 코드 관리 (sym.ccm) ==========

    @Bean
    public EgovIdGnrService egovAdministCodeRecptnIdGnrService() {
        return createIdGnrService("ADMINIST_CODE_ID", "ADM_", 10);
    }

    @Bean
    public EgovIdGnrService egovInsttCodeRecptnIdGnrService() {
        return createIdGnrService("INSTT_CODE_ID", "INSTT_", 10);
    }

    // ========== 보고서 통계 (sts.rst) ==========

    @Bean
    public EgovIdGnrService egovReprtStatsIdGnrService() {
        return createIdGnrService("REPRT_STATS_ID", "RPTSTS_", 10);
    }

    // ========== 자료이용현황 통계 (sts.dst) ==========

    @Bean
    public EgovIdGnrService egovDtaUseStatsIdGnrService() {
        return createIdGnrService("DTA_USE_STATS_ID", "DTAUSE_", 10);
    }

    // ========== 공통 메서드 ==========

    /**
     * EgovTableIdGnrServiceImpl을 사용하여 IdGnrService를 생성합니다.
     * 
     * @param tableName ID 관리 테이블명 (COMTECOPSEQ 테이블의 TABLE_NAME 컬럼)
     * @param prefix    생성될 ID의 접두사
     * @param cipers    ID 숫자 부분의 자릿수
     * @return 설정된 EgovIdGnrService 인스턴스
     */
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
}
