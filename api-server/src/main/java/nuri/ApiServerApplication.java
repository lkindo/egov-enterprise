package nuri;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.builder.SpringApplicationBuilder;
import nuri.foundation.core.config.FullBeanNameGenerator;

/**
 * 프로젝트 메인 애플리케이션 클래스
 */
// [2026-08-07] `exclude = { OpenAiAutoConfiguration.class }` 제거 — spring-ai 의존성 자체를
//   걷어냈으므로 배제할 대상이 없다. 없는 것을 배제하는 선언은 남기면 그 자체가 팬텀 참조다.
@SpringBootApplication(nameGenerator = FullBeanNameGenerator.class)
// [§2.A D4 2026-07-18] 컴포넌트스캔 "벽" 해체 — basePackages 에서 egovframework/org.egovframe 제거.
// 실측 근거: nuri main 이 소비하는 egov 는 전부 우리 @Configuration(EgovMessageConfig/
// ProjectCryptoConfig/EgovPasswordEncoder) 이 정의하는 라이브러리 인스턴스 + static EgovFileScrty 뿐이며,
// [정정 2026-07-28] 종전 이 목록에 있던 `EgovPropertyConfig` 는 **저장소에 실존하지 않는 클래스**였다
//   (`find -name EgovPropertyConfig.java` = 0). 아키텍처 결정의 근거로 팬텀 클래스를 인용하고 있었으므로
//   제거한다 — 실존하지 않는 것을 인용한 근거는 근거가 아니다(§2.G 死주석).
// 스캔으로 등록되는 egov @Component 를 주입/소비하는 코드는 0(import egovframework/org.egovframe grep 6건 전부
// @Bean 정의·static util). 따라서 egov 스캔은 원치 않는 컨트롤러/auto-config 만 끌어와 다시 배제하던 순부담이라
// 스캔·제외필터(22 REGEX + 3 egov ASSIGNABLE) 통째 제거. 우리 egov @Bean 은 그대로 유지된다.
@ComponentScan(basePackages = { "nuri" }, nameGenerator = FullBeanNameGenerator.class, excludeFilters = {
                                @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
                                                nuri.business.security.config.SecurityConfig.class
                                }),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test$"),
                                @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*TestConfig.*"),
                                @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = { SpringBootApplication.class })
                })
public class ApiServerApplication extends SpringBootServletInitializer {

        @Override
        protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
                return application.sources(ApiServerApplication.class);
        }

        public static void main(String[] args) {
                SpringApplication app = new SpringApplication(ApiServerApplication.class);
                app.setAllowCircularReferences(true);
                app.setAllowBeanDefinitionOverriding(true);
                app.run(args);
        }

        @org.springframework.context.annotation.Bean
        public org.egovframe.rte.fdl.crypto.EgovEnvCryptoService egovEnvCryptoService() {
                return new org.egovframe.rte.fdl.crypto.impl.EgovEnvCryptoServiceImpl();
        }
}
