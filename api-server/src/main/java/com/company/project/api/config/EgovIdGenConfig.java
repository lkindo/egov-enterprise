package com.company.project.api.config;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import javax.sql.DataSource;

@Configuration
public class EgovIdGenConfig {

    private final DataSource dataSource;

    public EgovIdGenConfig(@Qualifier("dataSource") DataSource dataSource) {
        this.dataSource = dataSource;
    }

    // Default Strategy
    @Bean
    public EgovIdGnrStrategyImpl defaultStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("TEST_");
        strategy.setCipers(20);
        strategy.setFillChar('0');
        return strategy;
    }

    // Helper method to create EgovTableIdGnrServiceImpl beans
    private EgovTableIdGnrServiceImpl createIdService(String tableName, EgovIdGnrStrategyImpl strategy) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(strategy);
        service.setBlockSize(10);
        service.setTable("IDS");
        service.setTableName(tableName);
        return service;
    }

    private EgovTableIdGnrServiceImpl createIdService(String tableName) {
        return createIdService(tableName, defaultStrategy());
    }

    // [1] CMS & Portal Core
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNttIdGnrService() {
        return createIdService("NTT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovBbsIdGnrService() {
        return createIdService("BBS_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCmmntyIdGnrService() {
        return createIdService("CMMNTY_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovClubIdGnrService() {
        return createIdService("CLUB_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovTmplatIdGnrService() {
        return createIdService("TMPLAT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovFileIdGnrService() {
        return createIdService("FILE_ID");
    }

    // [2] Security & Roles
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovAuthorCodeGnrService() {
        return createIdService("AUTHOR_CODE");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRoleCodeGnrService() {
        return createIdService("ROLE_CODE");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovGroupIdGnrService() {
        return createIdService("GROUP_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovLoginPolicyIdGnrService() {
        return createIdService("LOGIN_POLICY_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovUsrCnfrmIdGnrService() {
        return createIdService("USR_CNFRM_ID");
    }

    // [3] Monitoring & Logs
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovLoginLogIdGnrService() {
        return createIdService("LOGIN_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSysLogIdGnrService() {
        return createIdService("SYS_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovUserLogIdGnrService() {
        return createIdService("USER_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovWebLogIdGnrService() {
        return createIdService("WEB_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovTrsmrcvLogIdGnrService() {
        return createIdService("TRSMRCV_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovProxyLogIdGnrService() {
        return createIdService("PROXY_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovHttpLogManageIdGnrService() {
        return createIdService("HTTP_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovProcessMonLogIdGnrService() {
        return createIdService("PROCS_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovFileSysMntrngLogIdGnrService() {
        return createIdService("FILESYS_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovServerResrceMntrngLogIdGnrService() {
        return createIdService("SRVR_RES_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovTrsmrcvMntrngLogIdGnrService() {
        return createIdService("TRSMRCV_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNtwrkSvcMntrngLogIdGnrService() {
        return createIdService("NTWRK_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDbMntrngLogIdGnrService() {
        return createIdService("DBM_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovProxySvcIdGnrService() {
        return createIdService("PROXY_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovProcessMonIdGnrService() {
        return createIdService("PROCS_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSynchrnServerIdGnrService() {
        return createIdService("SYNC_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovHttpManageIdGnrService() {
        return createIdService("HTTP_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovFileSysMntrngIdGnrService() {
        return createIdService("FILESYS_ID");
    }

    // [4] Surveys & Polls
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovOnlinePollManageIdGnrService() {
        return createIdService("ONLINE_POLL_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovOnlinePollItemIdGnrService() {
        return createIdService("ONLINE_POLL_ITEM_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovOnlinePollResultIdGnrService() {
        return createIdService("ONLINE_POLL_RESULT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrManageIdGnrService() {
        return createIdService("QUSTNR_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrQestnManageIdGnrService() {
        return createIdService("QUSTNR_QESTN_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrItemManageIdGnrService() {
        return createIdService("QUSTNR_ITEM_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrTmplatManageIdGnrService() {
        return createIdService("QUSTNR_TMPLAT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService qustnrRespondManageIdGnrService() {
        return createIdService("QUSTNR_RESPOND_MANAGE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService qustnrRespondInfoIdGnrService() {
        return createIdService("QUSTNR_RESPOND_INFO_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovOnlinePollIdGnrService() {
        return createIdService("POLL_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrQestnIdGnrService() {
        return createIdService("QUSTNR_QESTN_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrRespondIdGnrService() {
        return createIdService("QUSTNR_RESPOND_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQustnrResultIdGnrService() {
        return createIdService("QUSTNR_RESULT_ID");
    }

    // [5] Business & Public Collaboration
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCnsltManageIdGnrService() {
        return createIdService("CNSLT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovQnaManageIdGnrService() {
        return createIdService("QNA_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovFaqManageIdGnrService() {
        return createIdService("FAQ_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMgtIdGnrService() {
        return createIdService("MGT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovWordDicaryIdGnrService() {
        return createIdService("WORD_DICARY_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovOnlineMenualIdGnrService() {
        return createIdService("ONLINE_MNUAL_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovHpcmManageIdGnrService() {
        return createIdService("HPCM_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovAdministrationWordIdGnrService() {
        return createIdService("ADMINISTRATION_WORD_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovIntnetSvcGuidanceIdGnrService() {
        return createIdService("INTNET_SVC_GUIDE_ID");
    }

    // [6] Personalization & Social
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovIndvdlPgeIdGnrService() {
        return createIdService("INDVDL_PGE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovWikiBookmarkIdGnrService() {
        return createIdService("WIKI_BOOKMARK_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovUnityLinkIdGnrService() {
        return createIdService("UNITY_LINK_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSiteManageIdGnrService() {
        return createIdService("SITE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRwardManageIdGnrService() {
        return createIdService("RWARD_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRssTagManageIdGnrService() {
        return createIdService("RSS_TAG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRoughMapIdGnrService() {
        return createIdService("ROUGH_MAP_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRecomendSiteManageIdGnrService() {
        return createIdService("RECOMEND_SITE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovPopupManageIdGnrService() {
        return createIdService("POPUP_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNewsManageIdGnrService() {
        return createIdService("NEWS_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSrchwrdIdGnrService() {
        return createIdService("SRCHWRD_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSrchwrdManageIdGnrService() {
        return createIdService("SRCHWRD_MANAGE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMainImageIdGnrService() {
        return createIdService("MAIN_IMAGE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovBannerIdGnrService() {
        return createIdService("BANNER_ID");
    }

    // [7] Cooperation & Schedules
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService deptSchdulManageIdGnrService() {
        return createIdService("SCHDUL_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovLeaderSchdulIdGnrService() {
        return createIdService("LEADER_SCHDUL_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovAnnvrsryManageIdGnrService() {
        return createIdService("ANNVRSRY_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovEventInfoIdGnrService() {
        return createIdService("EVENT_INFO_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovEventManageIdGnrService() {
        return createIdService("EVENT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMtgPlaceManageIdGnrService() {
        return createIdService("MTG_PLACE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMtgPlaceResveIdGnrService() {
        return createIdService("MTG_PLACE_RESVE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovInfrmlSanctnIdGnrService() {
        return createIdService("INFRML_SANCTN_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCtsnnManageIdGnrService() {
        return createIdService("CTSNN_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNcrdIdGnrService() {
        return createIdService("NCRD_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovScrapIdGnrService() {
        return createIdService("SCRAP_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMemoTodoIdGnrService() {
        return createIdService("MEMO_TODO_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMemoReprtIdGnrService() {
        return createIdService("MEMO_REPRT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNoteIdGnrService() {
        return createIdService("NOTE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNoteManageIdGnrService() {
        return createIdService("NOTE_MANAGE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNoteRecptnIdGnrService() {
        return createIdService("NOTE_RECPTN_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovNoteTrnsmitIdGnrService() {
        return createIdService("NOTE_TRNSMIT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService diaryManageIdGnrService() {
        return createIdService("DIARY_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovExtrlhrInfoIdGnrService() {
        return createIdService("EXTRLHR_INFO_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCmtManageIdGnrService() {
        return createIdService("CMT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovWikMnthngReprtIdGnrService() {
        return createIdService("WIK_MNTHNG_ID");
    }

    // [8] External Systems & Data
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDeptIdGnrService() {
        return createIdService("DEPT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDeptManageIdGnrService() {
        return createIdService("DEPT_MANAGE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovZipIdGnrService() {
        return createIdService("ZIP_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRestdeIdGnrService() {
        return createIdService("RESTDE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDeptJobIdGnrService() {
        return createIdService("DEPT_JOB_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDeptJobLogIdGnrService() {
        return createIdService("DEPT_JOB_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDeptJobBxIdGnrService() {
        return createIdService("DEPT_JOB_BX_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDeptJobBxLogIdGnrService() {
        return createIdService("DEPT_JOB_BX_LOG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCntcInsttIdGnrService() {
        return createIdService("CNTC_INSTT_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCntcSystemIdGnrService() {
        return createIdService("CNTC_SYSTEM_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCntcMessageIdGnrService() {
        return createIdService("CNTC_MSG_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCntcMessageItemIdGnrService() {
        return createIdService("CNTC_MSG_ITEM_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCntcServiceIdGnrService() {
        return createIdService("CNTC_SERVICE_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSystemCntcIdGnrService() {
        return createIdService("SYSTEM_CNTC_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovRequestOfferIdGnrService() {
        return createIdService("REQUEST_OFFER_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDtaUseStatsIdGnrService() {
        return createIdService("DTA_USE_STATS_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovDamManageIdGnrService() {
        return createIdService("DAM_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovInsttCodeRecptnIdGnrService() {
        return createIdService("INSTT_CODE_RECPTN_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovAdministCodeRecptnIdGnrService() {
        return createIdService("ADMINIST_CODE_RECPTN_ID");
    }

    // [9] Policies & Terms
    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovIndvdlInfoPolicyIdGnrService() {
        return createIdService("INDVDL_ID");
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovStplatManageIdGnrService() {
        return createIdService("STPLAT_ID");
    }

    // SMS Strategy
    @Bean
    public EgovIdGnrStrategyImpl smsStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("SMS_");
        strategy.setCipers(16);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovSmsIdGnrService() {
        return createIdService("SMS_ID", smsStrategy());
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovCpyrhtPrtcPolicyIdGnrService() {
        return createIdService("CPYRHT_ID");
    }

    // Strategies
    @Bean
    public EgovIdGnrStrategyImpl nttIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("NTT_");
        strategy.setCipers(20);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean
    public EgovIdGnrStrategyImpl bbsIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BBS_");
        strategy.setCipers(20);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean
    public EgovIdGnrStrategyImpl mailMsgStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("MAILMSG_");
        strategy.setCipers(12);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService egovMailMsgIdGnrService() {
        return createIdService("MAILMSG_ID", mailMsgStrategy());
    }
}
