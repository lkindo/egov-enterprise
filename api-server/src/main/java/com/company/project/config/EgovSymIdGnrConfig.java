package com.company.project.config;

import javax.sql.DataSource;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * ?úÏä§??Í¥ÄÎ¶?sym) Î™®Îìà??ID ?ùÏÑ± ?úÎπÑ???§Ï†ï
 * Í≥µÌÜµ Ïª¥Ìè¨?åÌä∏??EgovTableIdGnrServiceImplÎ•??¨Ïö©?òÏó¨ Í∞??åÏù¥Î∏îÎ≥Ñ Í≥†Ïú† IDÎ•??ùÏÑ±?? * 
 * @since 2026-01-05
 */
@Configuration
public class EgovSymIdGnrConfig {
    private final DataSource dataSource;

    public EgovSymIdGnrConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // ========== Î∞∞Ïπò Í¥ÄÎ¶?ID ?ùÏÑ± (sym.bat) ==========
    @Bean(name = "egovBatchOpertIdGnrService")
    public EgovIdGnrService egovBatchOpertIdGnrService() {
        return createIdGnrService("BATCH_OPERT_ID", "BATCH_", 10);
    }

    @Bean(name = "egovBatchSchdulIdGnrService")
    public EgovIdGnrService egovBatchSchdulIdGnrService() {
        return createIdGnrService("BATCH_SCHDUL_ID", "SCHDUL_", 10);
    }

    // ========== Î∞±ÏóÖ Í¥ÄÎ¶?ID ?ùÏÑ± (sym.sym.bak) ==========
    @Bean(name = "egovBackupOpertIdGnrService")
    public EgovIdGnrService egovBackupOpertIdGnrService() {
        return createIdGnrService("BACKUP_OPERT_ID", "BACKUP_", 10);
    }

    // ========== ?ïÎ≥¥?åÎ¶º??Í¥ÄÎ¶?ID ?ùÏÑ± (uss.ion.ism) ==========
    @Bean(name = "egovInfrmlSanctnIdGnrService")
    public EgovIdGnrService egovInfrmlSanctnIdGnrService() {
        return createIdGnrService("INFRML_SANCTN_ID", "ISM_", 10);
    }

    // ========== Ï™ΩÏ? Í¥ÄÎ¶?ID ?ùÏÑ± (uss.ion.nts/ntr/ntm) ==========
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

    // ========== ?ôÍ∏∞?îÏÑúÎ≤?Í¥ÄÎ¶?ID ?ùÏÑ± (utl.sys.ssy) ==========
    @Bean(name = "egovSynchrnServerIdGnrService")
    public EgovIdGnrService egovSynchrnServerIdGnrService() {
        return createIdGnrService("SYNCHRN_SERVER_ID", "SYNCH_", 10);
    }

    // ========== ?âÏÇ¨/?¥Î≤§??Í¥ÄÎ¶?ID ?ùÏÑ± (uss.ion.evt) ==========
    @Bean(name = "egovEventIdGnrService")
    public EgovIdGnrService egovEventIdGnrService() {
        return createIdGnrService("EVENT_ID", "EVENT_", 10);
    }

    @Bean(name = "egovEventCmpgnIdGnrService")
    public EgovIdGnrService egovEventCmpgnIdGnrService() {
        return createIdGnrService("EVENT_CMPGN_ID", "ECC_", 10);
    }

    // ========== ?¨ÏÉÅ Í¥ÄÎ¶?ID ?ùÏÑ± (uss.ion.rwd) ==========
    @Bean(name = "egovRwardIdGnrService")
    public EgovIdGnrService egovRwardIdGnrService() {
        return createIdGnrService("RWARD_ID", "RWARD_", 10);
    }

    // ========== Í∏∞ÎÖê??Í¥ÄÎ¶?ID ?ùÏÑ± (uss.ion.ans) ==========
    @Bean(name = "egovAnnvrsryIdGnrService")
    public EgovIdGnrService egovAnnvrsryIdGnrService() {
        return createIdGnrService("ANNVRSRY_ID", "ANN_", 10);
    }

    // ========== Í≤ΩÏ°∞??Í¥ÄÎ¶?ID ?ùÏÑ± (uss.ion.ctn) ==========
    @Bean(name = "egovCtsnnIdGnrService")
    public EgovIdGnrService egovCtsnnIdGnrService() {
        return createIdGnrService("CTSNN_ID", "CTSNN_", 10);
    }

    // ========== ?¥Ïùº Í¥ÄÎ¶?ID ?ùÏÑ± (sym.cal) ==========
    @Bean(name = "egovRestDeIdGnrService")
    public EgovIdGnrService egovRestDeIdGnrService() {
        return createIdGnrService("RESTDE_ID", "RESTDE_", 10);
    }

    // ========== ?§Ìä∏?åÌÅ¨ Í¥ÄÎ¶?ID ?ùÏÑ± (sym.sym.nwk) ==========
    @Bean(name = "egovNtwrkIdGnrService")
    public EgovIdGnrService egovNtwrkIdGnrService() {
        return createIdGnrService("NTWRK_ID", "NTWRK_", 10);
    }

    // ========== ?úÎ≤Ñ Í¥ÄÎ¶?ID ?ùÏÑ± (sym.sym.srv) ==========
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

    // ========== ?ÑÎ°ú?∏Ïä§ Î™®Îãà?∞ÎßÅ Í¥ÄÎ¶?ID ?ùÏÑ± (utl.sys.prm) ==========
    @Bean(name = "egovProcessMonLogIdGnrService")
    public EgovIdGnrService egovProcessMonLogIdGnrService() {
        return createIdGnrService("PROCESS_MON_LOG_ID", "PRMLOG_", 10);
    }

    // ========== DB Î™®Îãà?∞ÎßÅ Í¥ÄÎ¶?ID ?ùÏÑ± (utl.sys.dbm) ==========
    @Bean(name = "egovDbMntrngLogIdGnrService")
    public EgovIdGnrService egovDbMntrngLogIdGnrService() {
        return createIdGnrService("DB_MNTRNG_LOG_ID", "DBMLOG_", 10);
    }

    // ========== ?åÏùº?úÏä§??Î™®Îãà?∞ÎßÅ Í¥ÄÎ¶?ID ?ùÏÑ± (utl.sys.fsm) ==========
    @Bean(name = "egovFileSysMntrngLogIdGnrService")
    public EgovIdGnrService egovFileSysMntrngLogIdGnrService() {
        return createIdGnrService("FILE_SYS_LOG_ID", "FSMLOG_", 10);
    }

    // ========== HTTP Î™®Îãà?∞ÎßÅ Í¥ÄÎ¶?ID ?ùÏÑ± (utl.sys.htm) ==========
    @Bean(name = "egovHttpMonLogIdGnrService")
    public EgovIdGnrService egovHttpMonLogIdGnrService() {
        return createIdGnrService("HTTP_MON_LOG_ID", "HTMLOG_", 10);
    }

    // ========== ?§Ìä∏?åÌÅ¨ ?úÎπÑ??Î™®Îãà?∞ÎßÅ Í¥ÄÎ¶?ID ?ùÏÑ± (utl.sys.nsm) ==========
    @Bean(name = "egovNtwrkSvcMntrngLogIdGnrService")
    public EgovIdGnrService egovNtwrkSvcMntrngLogIdGnrService() {
        return createIdGnrService("NTWRK_SVC_LOG_ID", "NSMLOG_", 10);
    }

    @Bean(name = "egovTrsmrcvMntrngLogIdGnrService")
    public EgovIdGnrService egovTrsmrcvMntrngLogIdGnrService() {
        return createIdGnrService("TRSMRCV_MNT_LOG_ID", "TRMLOG_", 10);
    }

    // ========== ?•Ïï† Í¥ÄÎ¶?ID ?ùÏÑ± (sym.tbm) ==========
    @Bean(name = "egovTroblIdGnrService")
    public EgovIdGnrService egovTroblIdGnrService() {
        return createIdGnrService("TROBL_ID", "TROBL_", 10);
    }

    // ========== ?úÏä§??Î°úÍ∑∏ Í¥ÄÎ¶?ID ?ùÏÑ± (sym.log) ==========
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

    // ========== Í≥µÌÜµÏΩîÎìú Í¥ÄÎ¶?ID ?ùÏÑ± (sym.ccm) ==========
    @Bean(name = "egovAdministCodeRecptnIdGnrService")
    public EgovIdGnrService egovAdministCodeRecptnIdGnrService() {
        return createIdGnrService("ADMINIST_CODE_ID", "ADM_", 10);
    }

    @Bean(name = "egovInsttCodeRecptnIdGnrService")
    public EgovIdGnrService egovInsttCodeRecptnIdGnrService() {
        return createIdGnrService("INSTT_CODE_ID", "INSTT_", 10);
    }

    // ========== Î≥¥Í≥†???µÍ≥Ñ ID ?ùÏÑ± (sts.rst) ==========
    @Bean(name = "reprtStatsIdGnrService")
    public EgovIdGnrService egovReprtStatsIdGnrService() {
        return createIdGnrService("REPRT_STATS_ID", "RPTSTS_", 10);
    }

    // ========== ?∞Ïù¥???¨Ïö© ?µÍ≥Ñ ID ?ùÏÑ± (sts.dst) ==========
    @Bean(name = "egovDtaUseStatsIdGnrService")
    public EgovIdGnrService egovDtaUseStatsIdGnrService() {
        return createIdGnrService("DTA_USE_STATS_ID", "DTAUSE_", 10);
    }

    // ========== ID ?ùÏÑ± ?¨Ìçº Î©îÏÜå??==========
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

    // ========== ?¨Ïö©???ïÏù∏ ID ?ùÏÑ± (uss.umt) ==========
    @Bean(name = "egovUsrCnfrmIdGnrService")
    public EgovIdGnrService egovUsrCnfrmIdGnrService() {
        return createIdGnrService("USRCNFRM_ID", "USRCNFRM_", 20);
    }

    // ========== Ï∂îÍ? ID ?ùÏÑ± ?úÎπÑ??(Ï§ëÏïô ÏßëÏ§ë?? ==========
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
