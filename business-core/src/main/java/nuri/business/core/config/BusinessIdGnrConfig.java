package nuri.business.core.config;

import javax.sql.DataSource;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 비즈니스 애플리케이션 모듈의 ID 생성 설정 (EgovIdGnrConfig로부터 이관)
 */
@Configuration
public class BusinessIdGnrConfig {
    private final DataSource dataSource;

    public BusinessIdGnrConfig(DataSource dataSource) {
        this.dataSource = dataSource;
    }

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

    @Bean(name = "egovEventIdGnrService")
    public EgovIdGnrService egovEventIdGnrService() {
        return createIdGnrService("EVENT_ID", "EVENT_", 10);
    }

    @Bean(name = "egovEventCmpgnIdGnrService")
    public EgovIdGnrService egovEventCmpgnIdGnrService() {
        return createIdGnrService("EVENT_CMPGN_ID", "ECC_", 10);
    }

    @Bean(name = "egovRwardIdGnrService")
    public EgovIdGnrService egovRwardIdGnrService() {
        return createIdGnrService("RWARD_ID", "RWARD_", 10);
    }

    @Bean(name = "egovAnnvrsryIdGnrService")
    public EgovIdGnrService egovAnnvrsryIdGnrService() {
        return createIdGnrService("ANNVRSRY_ID", "ANN_", 10);
    }

    @Bean(name = "egovCtsnnIdGnrService")
    public EgovIdGnrService egovCtsnnIdGnrService() {
        return createIdGnrService("CTSNN_ID", "CTSNN_", 10);
    }

    @Bean(name = "egovScrapIdGnrService")
    public EgovIdGnrService egovScrapIdGnrService() {
        return createIdGnrService("ids", "SCRAP_", 14);
    }

    @Bean(name = "egovMemoReportIdGnrService")
    public EgovIdGnrService egovMemoReportIdGnrService() {
        return createIdGnrService("ids", "MEMO_", 15);
    }

    @Bean(name = "egovPopupManageIdGnrService")
    public EgovIdGnrService egovPopupManageIdGnrService() {
        return createIdGnrService("ids", "POPUP_", 14);
    }

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
