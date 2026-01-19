package com.company.project.config;

import egovframework.com.sym.sym.bak.service.BackupScheduler;
import egovframework.com.sym.sym.bak.service.EgovBackupOpertService;
import egovframework.com.sym.sym.bak.service.EgovBackupResultService;
import egovframework.com.sym.sym.bak.service.impl.BackupOpertDao;
import egovframework.com.sym.sym.bak.service.impl.BackupResultDao;
import egovframework.com.sym.sym.bak.service.impl.EgovBackupOpertServiceImpl;
import egovframework.com.sym.sym.bak.service.impl.EgovBackupResultServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;
import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * 백업 자동 실행(Quartz) 및 ID 생성을 위한 설정 클래스
 */
@Configuration
public class BackupConfig {

    @Bean(name = "egovBackupOpertIdGnrService")
    public EgovIdGnrService egovBackupOpertIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(backupOpertIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("BACKUP_OPERT_ID");
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl backupOpertIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BAK");
        strategy.setCipers(17);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "egovBackupResultIdGnrService")
    public EgovIdGnrService egovBackupResultIdGnrService(DataSource dataSource) {
        EgovTableIdGnrServiceImpl service = new EgovTableIdGnrServiceImpl();
        service.setDataSource(dataSource);
        service.setStrategy(backupResultIdStrategy());
        service.setBlockSize(1);
        service.setTable("COMTECOPSEQ");
        service.setTableName("BACKUP_RESULT_ID"); // Different row from Batch's BATCH_RESULT_ID
        return service;
    }

    @Bean
    public EgovIdGnrStrategyImpl backupResultIdStrategy() {
        EgovIdGnrStrategyImpl strategy = new EgovIdGnrStrategyImpl();
        strategy.setPrefix("BRT");
        strategy.setCipers(17);
        strategy.setFillChar('0');
        return strategy;
    }

    @Bean(name = "backupScheduler", initMethod = "init", destroyMethod = "destroy")
    public BackupScheduler backupScheduler(EgovBackupOpertService egovBackupOpertService,
            EgovIdGnrService egovBackupResultIdGnrService) {
        BackupScheduler scheduler = new BackupScheduler();
        scheduler.setEgovBackupOpertService(egovBackupOpertService);
        scheduler.setIdgenService(egovBackupResultIdGnrService);
        return scheduler;
    }

    @Bean(name = "egovBackupOpertService")
    public EgovBackupOpertService egovBackupOpertService(BackupOpertDao backupOpertDao,
            BackupResultDao backupResultDao) {
        // Dependencies are injected via @Resource in the implementation
        EgovBackupOpertServiceImpl service = new EgovBackupOpertServiceImpl();
        return service;
    }

    @Bean(name = "egovBackupResultService")
    public EgovBackupResultService egovBackupResultService(BackupResultDao backupResultDao) {
        // Dependencies are injected via @Resource in the implementation
        EgovBackupResultServiceImpl service = new EgovBackupResultServiceImpl();
        return service;
    }

    @Bean(name = "backupOpertDao")
    public BackupOpertDao backupOpertDao() {
        return new BackupOpertDao();
    }

    @Bean(name = "backupResultDao")
    public BackupResultDao backupResultDao() {
        return new BackupResultDao();
    }
}
