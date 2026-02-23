package com.company.project.config;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * 배치 ID 생성 서비스 설정
 * - BatchScheduler(Quartz) 제거: 레거시 sym.bat 의존성 삭제로 함께 제거됨
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

}
