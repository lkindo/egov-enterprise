package com.company.project.core.config;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

@Configuration
public class EgovIdGnrConfig {

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService boardIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(boardIdStrategy());
        idGnrService.setBlockSize(10);
        idGnrService.setTable("IDS");
        idGnrService.setTableName("BBS_ID");
        return idGnrService;
    }

    @Bean
    public EgovIdGnrStrategyImpl boardIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BBS_");
        strategy.setCipers(12);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(destroyMethod = "destroy")
    public EgovIdGnrService fileIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl idGnrService = new EgovTableIdGnrServiceImpl();
        idGnrService.setDataSource(dataSource);
        idGnrService.setStrategy(fileIdStrategy());
        idGnrService.setBlockSize(10);
        idGnrService.setTable("IDS");
        idGnrService.setTableName("FILE_ID");
        return idGnrService;
    }

    @Bean
    public EgovIdGnrStrategyImpl fileIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("FILE_");
        strategy.setCipers(12);
        strategy.setFillChar('0');
        return strategy;
    }
}
