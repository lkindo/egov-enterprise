package com.company.project.config;

import javax.sql.DataSource;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * ?�스??관�?sym) 모듈??ID ?�성 ?�비???�정
 * 공통 컴포?�트??EgovTableIdGnrServiceImpl�??�용?�여 �??�이블별 고유 ID�??�성?? * 
 * @since 2026-01-05
 */
@Configuration
public class EgovSymIdGnrConfig {
    private final DataSource dataSource;

    public EgovSymIdGnrConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ========== 배치 관�?ID ?�성 (sym.bat) ==========
    @Bean(name = "egovBatchOpertIdGnrService")
    public EgovIdGnrService egovBatchOpertIdGnrService() {
        return createIdGnrService("BATCH_OPERT_ID", "BATCH_", 10);
    }

    @Bean(name = "egovBatchSchdulIdGnrService")
    public EgovIdGnrService egovBatchSchdulIdGnrService() {
        return createIdGnrService("BATCH_SCHDUL_ID", "SCHDUL_", 10);
    }

    // ========== 백업 관�?ID ?�성 (sym.sym.bak) ==========
    @Bean(name = "egovBackupOpertIdGnrService")
    public EgovIdGnrService egovBackupOpertIdGnrService() {
        return createIdGnrService("BACKUP_OPERT_ID", "BACKUP_", 10);
    }

    // ========== ?�보?�림??관�?ID ?�성 (uss.ion.ism) ==========
    @Bean(name = "egovInfrmlSanctnIdGnrService")
    public EgovIdGnrService egovInfrmlSanctnIdGnrService() {
        return createIdGnrService("INFRML_SANCTN_ID", "ISM_", 10);
    }

    // ========== 쪽�? 관�?ID ?�성 (uss.ion.nts/ntr/ntm) ==========
    @Bean(name = "egovNoteIdGnrService")
    public EgovIdGnrService egovNoteIdGnrService() {
        return createIdGnrService("NOTE_ID", "NOTE_", 10);
    }

    @Bean(name = "egovNoteTrnsmitIdGnrService")
    public EgovIdGnrService egovNoteTrnsmitIdGnrService() {
        return createIdGnrService("NOTE_TRNSMIT_ID", "NOTETR_", 10);
    }

    @Bean(name = "egovNoteRecptnIdGnrService")
    public EgovIdGnrService egovNoteRecptnIdGnrService() {
        return createIdGnrService("NOTE_RECPTN_ID", "NOTERC_", 10);
    }

    // ========== ?�기?�서�?관�?ID ?�성 (utl.sys.ssy) ==========
    @Bean(name = "egovSynchrnServerIdGnrService")
    public EgovIdGnrService egovSynchrnServerIdGnrService() {
        return createIdGnrService("SYNCHRN_SERVER_ID", "SYNCH_", 10);
    }

    // ========== ?�사/?�벤??관�?ID ?�성 (uss.ion.evt) ==========
    @Bean(name = "egovEventIdGnrService")
    public EgovIdGnrService egovEventIdGnrService() {
        return createIdGnrService("EVENT_ID", "EVENT_", 10);
    }

    @Bean(name = "egovEventCmpgnIdGnrService")
    public EgovIdGnrService egovEventCmpgnIdGnrService() {
        return createIdGnrService("EVENT_CMPGN_ID", "ECC_", 10);
    }

    // ========== ?�상 관�?ID ?�성 (uss.ion.rwd) ==========
    @Bean(name = "egovRwardIdGnrService")
    public EgovIdGnrService egovRwardIdGnrService() {
        return createIdGnrService("RWARD_ID", "RWARD_", 10);
    }

    // ========== 기념??관�?ID ?�성 (uss.ion.ans) ==========
    @Bean(name = "egovAnnvrsryIdGnrService")
    public EgovIdGnrService egovAnnvrsryIdGnrService() {
        return createIdGnrService("ANNVRSRY_ID", "ANN_", 10);
    }

    // ========== 경조??관�?ID ?�성 (uss.ion.ctn) ==========
    @Bean(name = "egovCtsnnIdGnrService")
    public EgovIdGnrService egovCtsnnIdGnrService() {
        return createIdGnrService("CTSNN_ID", "CTSNN_", 10);
    }

    // ========== ?�일 관�?ID ?�성 (sym.cal) ==========
    @Bean(name = "egovRestDeIdGnrService")
    public EgovIdGnrService egovRestDeIdGnrService() {
        return createIdGnrService("RESTDE_ID", "RESTDE_", 10);
    }

    // ========== ?�트?�크 관�?ID ?�성 (sym.sym.nwk) ==========
    @Bean(name = "egovNtwrkIdGnrService")
    public EgovIdGnrService egovNtwrkIdGnrService() {
        return createIdGnrService("NTWRK_ID", "NTWRK_", 10);
    }

    // ========== ?�버 관�?ID ?�성 (sym.sym.srv) ==========
    @Bean(name = "egovServerIdGnrService")
    public EgovIdGnrService egovServerIdGnrService() {
        return createIdGnrService("SERVER_ID", "SVR_", 10);
    }

    @Bean(name = "egovServerEqpmnIdGnrService")
    public EgovIdGnrService egovServerEqpmnIdGnrService() {
        return createIdGnrService("SERVER_EQPMN_ID", "SVREQ_", 10);
    }

    @Bean(name = "egovServerResrceMntrngIdGnrService")
    public EgovIdGnrService egovServerResrceMntrngIdGnrService() {
        return createIdGnrService("SERVER_RESRCE_MNT_ID", "SRM_", 10);
    }

    // ========== ?�로?�스 모니?�링 관�?ID ?�성 (utl.sys.prm) ==========
    @Bean(name = "egovProcessMonLogIdGnrService")
    public EgovIdGnrService egovProcessMonLogIdGnrService() {
        return createIdGnrService("PROCESS_MON_LOG_ID", "PRMLOG_", 10);
    }

    // ========== DB 모니?�링 관�?ID ?�성 (utl.sys.dbm) ==========
    @Bean(name = "egovDbMntrngLogIdGnrService")
    public EgovIdGnrService egovDbMntrngLogIdGnrService() {
        return createIdGnrService("DB_MNTRNG_LOG_ID", "DBMLOG_", 10);
    }

    // ========== ?�일?�스??모니?�링 관�?ID ?�성 (utl.sys.fsm) ==========
    @Bean(name = "egovFileSysMntrngLogIdGnrService")
    public EgovIdGnrService egovFileSysMntrngLogIdGnrService() {
        return createIdGnrService("FILE_SYS_LOG_ID", "FSMLOG_", 10);
    }

    // ========== HTTP 모니?�링 관�?ID ?�성 (utl.sys.htm) ==========
    @Bean(name = "egovHttpMonLogIdGnrService")
    public EgovIdGnrService egovHttpMonLogIdGnrService() {
        return createIdGnrService("HTTP_MON_LOG_ID", "HTMLOG_", 10);
    }

    // ========== ?�트?�크 ?�비??모니?�링 관�?ID ?�성 (utl.sys.nsm) ==========
    @Bean(name = "egovNtwrkSvcMntrngLogIdGnrService")
    public EgovIdGnrService egovNtwrkSvcMntrngLogIdGnrService() {
        return createIdGnrService("NTWRK_SVC_LOG_ID", "NSMLOG_", 10);
    }

    @Bean(name = "egovTrsmrcvMntrngLogIdGnrService")
    public EgovIdGnrService egovTrsmrcvMntrngLogIdGnrService() {
        return createIdGnrService("TRSMRCV_MNT_LOG_ID", "TRMLOG_", 10);
    }

    // ========== ?�애 관�?ID ?�성 (sym.tbm) ==========
    @Bean(name = "egovTroblIdGnrService")
    public EgovIdGnrService egovTroblIdGnrService() {
        return createIdGnrService("TROBL_ID", "TROBL_", 10);
    }

    // ========== ?�스??로그 관�?ID ?�성 (sym.log) ==========
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

    // ========== 공통코드 관�?ID ?�성 (sym.ccm) ==========
    @Bean(name = "egovAdministCodeRecptnIdGnrService")
    public EgovIdGnrService egovAdministCodeRecptnIdGnrService() {
        return createIdGnrService("ADMINIST_CODE_ID", "ADM_", 10);
    }

    @Bean(name = "egovInsttCodeRecptnIdGnrService")
    public EgovIdGnrService egovInsttCodeRecptnIdGnrService() {
        return createIdGnrService("INSTT_CODE_ID", "INSTT_", 10);
    }

    // ========== 보고???�계 ID ?�성 (sts.rst) ==========
    @Bean(name = "reprtStatsIdGnrService")
    public EgovIdGnrService egovReprtStatsIdGnrService() {
        return createIdGnrService("REPRT_STATS_ID", "RPTSTS_", 10);
    }

    // ========== ?�이???�용 ?�계 ID ?�성 (sts.dst) ==========
    @Bean(name = "egovDtaUseStatsIdGnrService")
    public EgovIdGnrService egovDtaUseStatsIdGnrService() {
        return createIdGnrService("DTA_USE_STATS_ID", "DTAUSE_", 10);
    }

    // ========== ID ?�성 ?�퍼 메소??==========
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

    // ========== ?�용???�인 ID ?�성 (uss.umt) ==========
    @Bean(name = "egovUsrCnfrmIdGnrService")
    public EgovIdGnrService egovUsrCnfrmIdGnrService() {
        return createIdGnrService("USRCNFRM_ID", "USRCNFRM_", 20);
    }

    // ========== 추�? ID ?�성 ?�비??(중앙 집중?? ==========
    @Primary
    @Bean(name = "egovFileIdGnrService")
    public EgovIdGnrService egovFileIdGnrService() {
        return createIdGnrService("ids", "FILE_", 15);
    }

    @Bean(name = "egovBBSMstrIdGnrService")
    public EgovIdGnrService egovBBSMstrIdGnrService() {
        return createIdGnrService("ids", "BBSMSTR_", 12);
    }
}
