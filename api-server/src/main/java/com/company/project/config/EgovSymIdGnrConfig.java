package com.company.project.config;

import javax.sql.DataSource;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import jakarta.annotation.Resource;

/**
 * 시스템 관리(sym) 모듈의 ID 생성 서비스 설정
 * 공통 컴포넌트의 EgovTableIdGnrServiceImpl를 사용하여 각 테이블별 고유 ID를 생성함
 * 
 * @since 2026-01-05
 */
@Configuration
public class EgovSymIdGnrConfig {

    @Resource(name = "dataSource")
    private DataSource dataSource;

    // ========== 배치 관리 ID 생성 (sym.bat) ==========

    @Bean
    public EgovIdGnrService egovBatchOpertIdGnrService() {
        return createIdGnrService("BATCH_OPERT_ID", "BATCH_", 10);
    }

    @Bean
    public EgovIdGnrService egovBatchSchdulIdGnrService() {
        return createIdGnrService("BATCH_SCHDUL_ID", "SCHDUL_", 10);
    }

    // ========== 백업 관리 ID 생성 (sym.sym.bak) ==========

    @Bean
    public EgovIdGnrService egovBackupOpertIdGnrService() {
        return createIdGnrService("BACKUP_OPERT_ID", "BACKUP_", 10);
    }

    // ========== 정보알림이 관리 ID 생성 (uss.ion.ism) ==========

    @Bean
    public EgovIdGnrService egovInfrmlSanctnIdGnrService() {
        return createIdGnrService("INFRML_SANCTN_ID", "ISM_", 10);
    }

    // ========== 쪽지 관리 ID 생성 (uss.ion.nts/ntr/ntm) ==========

    @Bean
    public EgovIdGnrService egovNoteIdGnrService() {
        return createIdGnrService("NOTE_ID", "NOTE_", 10);
    }

    @Bean
    public EgovIdGnrService egovNoteTrnsmitIdGnrService() {
        return createIdGnrService("NOTE_TRNSMIT_ID", "NOTETR_", 10);
    }

    @Bean
    public EgovIdGnrService egovNoteRecptnIdGnrService() {
        return createIdGnrService("NOTE_RECPTN_ID", "NOTERC_", 10);
    }

    // ========== 동기화서버 관리 ID 생성 (utl.sys.ssy) ==========

    @Bean
    public EgovIdGnrService egovSynchrnServerIdGnrService() {
        return createIdGnrService("SYNCHRN_SERVER_ID", "SYNCH_", 10);
    }

    // ========== 행사/이벤트 관리 ID 생성 (uss.ion.evt) ==========

    @Bean
    public EgovIdGnrService egovEventIdGnrService() {
        return createIdGnrService("EVENT_ID", "EVENT_", 10);
    }

    @Bean
    public EgovIdGnrService egovEventCmpgnIdGnrService() {
        return createIdGnrService("EVENT_CMPGN_ID", "ECC_", 10);
    }

    // ========== 포상 관리 ID 생성 (uss.ion.rwd) ==========

    @Bean
    public EgovIdGnrService egovRwardIdGnrService() {
        return createIdGnrService("RWARD_ID", "RWARD_", 10);
    }

    // ========== 기념일 관리 ID 생성 (uss.ion.ans) ==========

    @Bean
    public EgovIdGnrService egovAnnvrsryIdGnrService() {
        return createIdGnrService("ANNVRSRY_ID", "ANN_", 10);
    }

    // ========== 경조사 관리 ID 생성 (uss.ion.ctn) ==========

    @Bean
    public EgovIdGnrService egovCtsnnIdGnrService() {
        return createIdGnrService("CTSNN_ID", "CTSNN_", 10);
    }

    // ========== 휴일 관리 ID 생성 (sym.cal) ==========

    @Bean
    public EgovIdGnrService egovRestDeIdGnrService() {
        return createIdGnrService("RESTDE_ID", "RESTDE_", 10);
    }

    // ========== 네트워크 관리 ID 생성 (sym.sym.nwk) ==========

    @Bean
    public EgovIdGnrService egovNtwrkIdGnrService() {
        return createIdGnrService("NTWRK_ID", "NTWRK_", 10);
    }

    // ========== 서버 관리 ID 생성 (sym.sym.srv) ==========

    @Bean
    public EgovIdGnrService egovServerIdGnrService() {
        return createIdGnrService("SERVER_ID", "SVR_", 10);
    }

    @Bean
    public EgovIdGnrService egovServerEqpmnIdGnrService() {
        return createIdGnrService("SERVER_EQPMN_ID", "SVREQ_", 10);
    }

    @Bean
    public EgovIdGnrService egovServerResrceMntrngIdGnrService() {
        return createIdGnrService("SERVER_RESRCE_MNT_ID", "SRM_", 10);
    }

    // ========== 프로세스 모니터링 관리 ID 생성 (utl.sys.prm) ==========

    @Bean
    public EgovIdGnrService egovProcessMonLogIdGnrService() {
        return createIdGnrService("PROCESS_MON_LOG_ID", "PRMLOG_", 10);
    }

    // ========== DB 모니터링 관리 ID 생성 (utl.sys.dbm) ==========

    @Bean
    public EgovIdGnrService egovDbMntrngLogIdGnrService() {
        return createIdGnrService("DB_MNTRNG_LOG_ID", "DBMLOG_", 10);
    }

    // ========== 파일시스템 모니터링 관리 ID 생성 (utl.sys.fsm) ==========

    @Bean
    public EgovIdGnrService egovFileSysMntrngLogIdGnrService() {
        return createIdGnrService("FILE_SYS_LOG_ID", "FSMLOG_", 10);
    }

    // ========== HTTP 모니터링 관리 ID 생성 (utl.sys.htm) ==========

    @Bean
    public EgovIdGnrService egovHttpMonLogIdGnrService() {
        return createIdGnrService("HTTP_MON_LOG_ID", "HTMLOG_", 10);
    }

    // ========== 네트워크 서비스 모니터링 관리 ID 생성 (utl.sys.nsm) ==========

    @Bean
    public EgovIdGnrService egovNtwrkSvcMntrngLogIdGnrService() {
        return createIdGnrService("NTWRK_SVC_LOG_ID", "NSMLOG_", 10);
    }

    @Bean
    public EgovIdGnrService egovTrsmrcvMntrngLogIdGnrService() {
        return createIdGnrService("TRSMRCV_MNT_LOG_ID", "TRMLOG_", 10);
    }

    // ========== 장애 관리 ID 생성 (sym.tbm) ==========

    @Bean
    public EgovIdGnrService egovTroblIdGnrService() {
        return createIdGnrService("TROBL_ID", "TROBL_", 10);
    }

    // ========== 시스템 로그 관리 ID 생성 (sym.log) ==========

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

    // ========== 공통코드 관리 ID 생성 (sym.ccm) ==========

    @Bean
    public EgovIdGnrService egovAdministCodeRecptnIdGnrService() {
        return createIdGnrService("ADMINIST_CODE_ID", "ADM_", 10);
    }

    @Bean
    public EgovIdGnrService egovInsttCodeRecptnIdGnrService() {
        return createIdGnrService("INSTT_CODE_ID", "INSTT_", 10);
    }

    // ========== 보고서 통계 ID 생성 (sts.rst) ==========

    @Bean
    public EgovIdGnrService egovReprtStatsIdGnrService() {
        return createIdGnrService("REPRT_STATS_ID", "RPTSTS_", 10);
    }

    // ========== 데이터 사용 통계 ID 생성 (sts.dst) ==========

    @Bean
    public EgovIdGnrService egovDtaUseStatsIdGnrService() {
        return createIdGnrService("DTA_USE_STATS_ID", "DTAUSE_", 10);
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

    // ========== 사용자 확인 ID 생성 (uss.umt) ==========

    @Bean
    public EgovIdGnrService egovUsrCnfrmIdGnrService() {
        return createIdGnrService("USRCNFRM_ID", "USRCNFRM_", 20);
    }

    // ========== 추가 ID 생성 서비스 (중앙 집중화) ==========

    @Primary
    @Bean
    public EgovIdGnrService egovFileIdGnrService() {
        return createIdGnrService("ids", "FILE_", 15);
    }

    @Bean
    public EgovIdGnrService egovBBSMstrIdGnrService() {
        return createIdGnrService("ids", "BBSMSTR_", 12);
    }
}
