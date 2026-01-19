package com.company.project.config;

import egovframework.com.sym.sym.nwk.service.impl.NtwrkDAO;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * 네트워크 관리 ID 생성 및 DAO 빈 등록 설정 클래스
 */
@Configuration
public class NtwrkConfig {

    @Bean(name = "egovNtwrkIdGnrService")
    public EgovIdGnrService egovNtwrkIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(ntwrkIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("NTWRK_ID");
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl ntwrkIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("NID_");
        strategy.setCipers(16);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "ntwrkDAO")
    public NtwrkDAO ntwrkDAO() {
        return new NtwrkDAO();
    }
}
