package com.company.project.config;

import egovframework.com.sym.bat.service.BatchScheduler;
import egovframework.com.sym.bat.service.EgovBatchSchdulService;
import egovframework.com.sym.bat.service.impl.BatchSchdulDao;
import egovframework.com.sym.bat.service.impl.EgovBatchSchdulServiceImpl;
import egovframework.com.sym.bat.service.impl.BatchResultDao;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * 배치 자동 실행(Quartz) 및 ID 생성을 위한 설정 클래스
 */
@Configuration
public class BatchConfig {

    @Bean(name = "egovBatchSchdulIdGnrService")
    public EgovIdGnrService egovBatchSchdulIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(batchSchdulIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("BATCH_SCHDUL_ID");
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl batchSchdulIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BSC");
        strategy.setCipers(17);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "egovBatchResultIdGnrService")
    public EgovIdGnrService egovBatchResultIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(batchResultIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("BATCH_RESULT_ID");
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl batchResultIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BRT");
        strategy.setCipers(17);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "batchScheduler", initMethod = "init", destroyMethod = "destroy")
    public BatchScheduler batchScheduler(EgovBatchSchdulService egovBatchSchdulService,
            EgovIdGnrService egovBatchResultIdGnrService) {
        BatchScheduler scheduler = new BatchScheduler();
        scheduler.setEgovBatchSchdulService(egovBatchSchdulService);
        scheduler.setIdgenService(egovBatchResultIdGnrService);
        return scheduler;
    }

    /**
     * BatchScheduler가 필요로 하는 레거시 인터페이스 타입의 서비스 빈 등록
     * (ApiServerApplication에서 sym.bat 패키지가 스캔 제외되어 있으므로 수동 등록)
     */
    @Bean(name = "egovBatchSchdulService")
    public EgovBatchSchdulService egovBatchSchdulService(BatchSchdulDao batchSchdulDao, BatchResultDao batchResultDao) {
        EgovBatchSchdulServiceImpl service = new EgovBatchSchdulServiceImpl();
        return service;
    }

    @Bean(name = "egovBatchResultService")
    public egovframework.com.sym.bat.service.EgovBatchResultService egovBatchResultService(
            BatchResultDao batchResultDao) {
        egovframework.com.sym.bat.service.impl.EgovBatchResultServiceImpl service = new egovframework.com.sym.bat.service.impl.EgovBatchResultServiceImpl();
        return service;
    }

    @Bean(name = "batchSchdulDao")
    public BatchSchdulDao batchSchdulDao() {
        return new BatchSchdulDao();
    }

    @Bean(name = "batchResultDao")
    public BatchResultDao batchResultDao() {
        return new BatchResultDao();
    }
}
