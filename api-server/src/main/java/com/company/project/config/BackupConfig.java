package com.company.project.config;

import com.company.project.service.backup.EgovBackupOpertService;

import com.company.project.service.backup.EgovBackupResultService;

import egovframework.com.sym.sym.bak.service.BackupScheduler;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

import org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl;

import org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl;

import org.springframework.context.annotation.Bean;

import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**

 *             ??   ?    ??      (Quartz)    ?ID ??      ???          ??       ??  ???(Modernized)

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

        service.setTableName("BACKUP_RESULT_ID");

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

    public BackupScheduler backupScheduler(EgovBackupOpertService backupOpertService,

            EgovBackupResultService backupResultService,

            EgovIdGnrService egovBackupResultIdGnrService) {

        BackupScheduler scheduler = new BackupScheduler();

        scheduler.setBackupOpertService(backupOpertService);

        scheduler.setBackupResultService(backupResultService);

        scheduler.setIdgenService(egovBackupResultIdGnrService);

        return scheduler;

    }

}

