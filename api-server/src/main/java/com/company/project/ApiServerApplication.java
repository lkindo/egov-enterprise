package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;

@EnableJpaAuditing
@EntityScan(basePackages = "com.company.project")
@EnableJpaRepositories(basePackages = "com.company.project")
@SpringBootApplication
@ComponentScan(basePackages = { "com.company.project", "egovframework",
                "org.egovframe" }, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                org.egovframe.rte.fdl.security.config.EgovSecurityConfiguration.class }),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.ram\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.gmt\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sec\\.rmt\\.web\\..*"),

                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uat\\.uap\\.web\\..*"),
                                // NOTE: sym 패키지 활성화 - IdGnrService 빈 등록 완료 (2026-01-05)
                                // 1. 기술적 문제(Quartz)로 인한 제외 (전체 제외 유지)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.bat\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.sym\\.bak\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.sym\\.nwk\\..*"), // 네트워크
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외

                                // 2. 모던 컨트롤러와 충돌나는 컨트롤러만 제외 (.web 패키지 한정)
                                // CCM: zip, ccc, cca, cde
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.ccm\\..*"), // CCM
                                                                                                                                  // 전체
                                                                                                                                  // 제외
                                                                                                                                  // (Zip,
                                                                                                                                  // Ccc,
                                                                                                                                  // Cca,
                                                                                                                                  // Cde,
                                                                                                                                  // Adc,
                                                                                                                                  // Acr
                                                                                                                                  // 등)

                                // LOG: 전체 제외 (Clg, Ulg, Slg, Wlg, Tlg 등 종속성 오류 방지)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.log\\..*"),

                                // MNU: mpm(메뉴관리), mcm(메뉴생성) - 모던 컨트롤러 사용
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mpm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.mcm\\.web\\..*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.mnu\\.bmm\\.web\\..*"), // 즐겨찾기
                                                                                                                                              // -
                                                                                                                                              // 종속성
                                                                                                                                              // 오류로
                                                                                                                                              // 제외

                                // PRM: prm(프로그램)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sym\\.prm\\.web\\..*"),

                                // STS: 전체 제외 (Cst, Bst, Dst, Vst, Rst 등 종속성 오류 방지)
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.sts\\..*"),
                                // COP 패키지: LegacyCollaborationController와 중복되는 컨트롤러만 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.bbs\\.web\\..*"), // 게시판
                                                                                                                                        // -
                                                                                                                                        // Legacy
                                                                                                                                        // 처리
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.adb\\.web\\..*"), // 주소록
                                                                                                                                        // -
                                                                                                                                        // Legacy
                                                                                                                                        // 처리
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.ncm\\.web\\..*"), // 명함
                                                                                                                                        // -
                                                                                                                                        // Legacy
                                                                                                                                        // 처리
                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =
                                // "egovframework\\.com\\.cop\\.smt\\.sim\\.web\\..*"), // 개인일정 - 활성화
                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =
                                // "egovframework\\.com\\.cop\\.smt\\.sdm\\.web\\..*"), // 부서일정 - 활성화
                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =
                                // "egovframework\\.com\\.cop\\.smt\\.mtm\\.web\\..*"), // 메모할일 - 활성화
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.ems\\..*"), // 메일발송
                                                                                                                                  // -
                                                                                                                                  // EgovMailConfig
                                                                                                                                  // Dummy
                                                                                                                                  // 사용
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.cop\\.com\\.web\\..*"), // 게시판사용정보
                                                                                                                                        // -
                                                                                                                                        // Legacy
                                                                                                                                        // 처리
                                // @ComponentScan.Filter(type = FilterType.REGEX, pattern =
                                // "egovframework\\.com\\.cop\\.com\\.web\\..*"), // 게시판사용정보 - Legacy 처리

                                // USS 패키지 활성화 (기업회원, 일반회원 관리 등)
                                // 단, UserManageController는 Modern Controller가 존재하므로 제외
                                // USS 패키지 활성화 (기업회원, 일반회원 관리 등)
                                // 단, UserManageController는 Modern Controller가 존재하므로 제외
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                egovframework.com.uss.umt.web.EgovUserManageController.class,
                                                egovframework.com.uss.ion.uas.web.EgovUserAbsnceController.class
                                }),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.uas\\.web\\.EgovUserAbsenceManageController.*"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.olp\\..*"), // 설문/투표
                                                                                                                                  // 도구
                                                                                                                                  // -
                                                                                                                                  // 종속성
                                                                                                                                  // 오류로
                                                                                                                                  // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.olh\\..*"), // 온라인도움말
                                                                                                                                  // -
                                                                                                                                  // 종속성
                                                                                                                                  // 오류로
                                                                                                                                  // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.rss\\..*"), // RSS
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.rsm\\..*"), // 최근검색어
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ntr\\..*"), // 받은쪽지
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ntm\\..*"), // 쪽지관리
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.noi\\..*"), // 정보알림
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.ctn\\..*"), // 경조사
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.evt\\..*"), // 행사
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\.nts\\..*"), // 보낸쪽지
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                                                                                                                        // -
                                                                                                                                        // 종속성
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                                                                                                                        // 도구
                                                                                                                                        // -
                                                                                                                                        // 오류로
                                                                                                                                        // 제외
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = "egovframework\\.com\\.uss\\.ion\\..*"), // USS
                                                                                                                                  // ION
                                                                                                                                  // 전체
                                                                                                                                  // 제외
                                                                                                                                  // (Mtg,
                                                                                                                                  // Ntr,
                                                                                                                                  // Ntm,
                                                                                                                                  // Noi,
                                                                                                                                  // Evt
                                                                                                                                  // 등
                                                                                                                                  // 포함)
// 그 외 USS 내의 Legacy Controller와의 충돌 방지 필요 시 추가 제외

})

public class ApiServerApplication extends SpringBootServletInitializer {

        @Override
        protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
                return application.sources(ApiServerApplication.class);
        }

        @org.springframework.context.annotation.Bean
        public egovframework.com.cmm.util.EgovUserDetailsHelper egovUserDetailsHelper(
                        egovframework.com.cmm.service.EgovUserDetailsService egovUserDetailsService) {
                egovframework.com.cmm.util.EgovUserDetailsHelper helper = new egovframework.com.cmm.util.EgovUserDetailsHelper();
                helper.setEgovUserDetailsService(egovUserDetailsService);
                return helper;
        }

        public static void main(String[] args) {
                SpringApplication app = new SpringApplication(ApiServerApplication.class);
                app.setAllowCircularReferences(true);
                app.run(args);
        }
}
