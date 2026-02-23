package com.company.project;

import org.springframework.boot.SpringApplication;

import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.context.annotation.ComponentScan;

import org.springframework.context.annotation.FilterType;

import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
@ComponentScan(basePackages = { "com.company.project", "egovframework",
                "org.egovframe" }, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                org.egovframe.rte.fdl.security.config.EgovSecurityConfiguration.class,
                                                org.egovframe.rte.fdl.crypto.config.EgovCryptoConfiguration.class }),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.ram\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.gmt\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.rmt\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uat\\.uap\\.web\\..*"),

                                // NOTE: sym ??? ?? ??- IdGnrService ??? ? (2026-01-05)

                                // 1. ???? ??Quartz) ?? ?? (? ?? ? ?)

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.bat\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.sym\\.bak\\..*"),

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.sym\\.sym\\.nwk\\..*"), // ?? ?? ?? ??

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                // 2. ??? ? ? ?? ? ?? ? ? ? ??? (.web ??? ?? )

                                // CCM: zip, ccc, cca, cde

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\..*"), // CCM

                                // ?

                                // ??

                                // (Zip,

                                // Ccc,

                                // Cca,

                                // Cde,

                                // Adc,

                                // Acr

                                // ??

                                // LOG: ? ?? (Clg, Ulg, Slg, Wlg, Tlg ??? ????? ?)

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.log\\..*"),

                                // MNU: mpm( ? ???, mcm( ??? ) - ??? ? ? ????

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mpm\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mcm\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.bmm\\.web\\..*"), // ?

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                // PRM: prm(? ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.prm\\.web\\..*"),

                                // STS: ? ?? (Cst, Bst, Dst, Vst, Rst ??? ????? ?)

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.sts\\..*"),

                                // COP ??? : LegacyCollaborationController?? ??? ? ? ? ???

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.cop\\.bbs\\.web\\..*"), // ???- ?? ??

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.cop\\.smt\\.sim\\.web\\..*"), // ??? - ?? ??

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.cop\\.smt\\.sdm\\.web\\..*"), // ? ?? ??- ?? ??

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.cop\\.smt\\.mtm\\.web\\..*"), // ?? - ?? ??

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.cop\\.ems\\..*"), // ? ?

                                // -

                                // EgovMailConfig

                                // Dummy

                                // ????

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.com\\.web\\..*"), // ??
                                                                                                                                        // ?
                                                                                                                                        // ??
                                                                                                                                        // ?

                                // -

                                // Legacy

                                // ??

                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =

                                // "egovframework\\.com\\.cop\\.com\\.web\\..*"), // ?? ? ?? ?- Legacy ??

                                // USS ??? ?? ??( ??? , ?? ??? ? ????

                                // ?? UserManageController??Modern Controller ???? ???

                                // USS ??? ?? ??( ??? , ?? ??? ? ????

                                // ?? UserManageController??Modern Controller ???? ???

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.umt\\.web\\.EgovUserManageController"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.uas\\.web\\.EgovUserAbsnceController"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.uas\\.web\\.EgovUserAbsenceManageController.*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.olp\\..*"), // ??
                                                                                                                                  // ???
                                                                                                                                  // ?

                                // ?

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.olh\\..*"), // ??
                                                                                                                                  // ?
                                                                                                                                  // ??
                                                                                                                                  // ?

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.rss\\..*"), // RSS

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.rsm\\..*"), // ?
                                                                                                                                        // ???

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ntr\\..*"), // ?
                                                                                                                                        // ?

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ntm\\..*"), // ??
                                                                                                                                        // ??

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.noi\\..*"), // ?
                                                                                                                                        // ???

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ctn\\..*"), // ???

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.evt\\..*"), // ??

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.nts\\..*"), // ?
                                                                                                                                        // ?
                                                                                                                                        // ??

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                // -

                                // ? ???

                                // ?? ?

                                // ??

                                // ?

                                // -

                                // ?? ?

                                // ??

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\..*"), // USS

// ION

// ?

// ??

// (Mtg,

// Ntr,

// Ntm,

// Noi,

// Evt

// ??

// ?? ?

// ???USS ?? Legacy Controller????? ? ? ? ??? ? ??

})

public class ApiServerApplication extends SpringBootServletInitializer {

        @Override

        protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {

                return application.sources(ApiServerApplication.class);

        }

        @org.springframework.context.annotation.Bean(name = "reprtStatsIdStrategy")

        public org.egovframe.rte.fdl.idgnr.EgovIdGnrStrategy reprtStatsIdStrategy() {

                org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl strategy = new org.egovframe.rte.fdl.idgnr.impl.strategy.EgovIdGnrStrategyImpl();

                strategy.setPrefix("RS_");

                strategy.setCipers(3);

                strategy.setFillChar('0');

                return strategy;

        }

        @org.springframework.context.annotation.Bean(name = "reprtStatsIdGnrService")

        public org.egovframe.rte.fdl.idgnr.EgovIdGnrService reprtStatsIdGnrService(

                        @org.springframework.beans.factory.annotation.Qualifier("dataSource") javax.sql.DataSource dataSource,

                        @org.springframework.beans.factory.annotation.Qualifier("reprtStatsIdStrategy") org.egovframe.rte.fdl.idgnr.EgovIdGnrStrategy reprtStatsIdStrategy) {

                org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl idGnrService = new org.egovframe.rte.fdl.idgnr.impl.EgovTableIdGnrServiceImpl();

                idGnrService.setDataSource(dataSource);

                idGnrService.setStrategy(reprtStatsIdStrategy);

                idGnrService.setBlockSize(10);

                idGnrService.setTable("COMTECOPSEQ");

                idGnrService.setTableName("RS_ID");

                return idGnrService;

        }

        public static void main(String[] args) {

                SpringApplication app = new SpringApplication(ApiServerApplication.class);

                app.setAllowCircularReferences(true);

                app.run(args);

        }

        @org.springframework.context.annotation.Bean
        public org.egovframe.rte.fdl.crypto.EgovEnvCryptoService egovEnvCryptoService() {
                org.egovframe.rte.fdl.crypto.impl.EgovEnvCryptoServiceImpl service = new org.egovframe.rte.fdl.crypto.impl.EgovEnvCryptoServiceImpl();
                return service;
        }
}
