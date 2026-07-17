package nuri.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.context.support.ReloadableResourceBundleMessageSource;
import org.springframework.core.io.ClassPathResource;
import javax.sql.DataSource;

@Configuration
@PropertySource(value = "classpath:/egovframework/egovProps/globals.properties", ignoreResourceNotFound = true)
@org.springframework.context.annotation.Profile("!test")
public class LegacyConfig {

    @Bean
    public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
        PropertySourcesPlaceholderConfigurer configurer = new PropertySourcesPlaceholderConfigurer();
        configurer.setLocations(new ClassPathResource("egovframework/egovProps/globals.properties"));
        configurer.setIgnoreUnresolvablePlaceholders(true);
        return configurer;
    }

    @Bean(name = "dataSource")
    @Primary
    @ConfigurationProperties(prefix = "spring.datasource")
    public DataSource dataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "egov.dataSource")
    @org.springframework.context.annotation.Lazy
    public DataSource egovDataSource(DataSource dataSource) {
        return dataSource;
    }

    @Bean(name = "messageSource")
    public ReloadableResourceBundleMessageSource messageSource() {
        ReloadableResourceBundleMessageSource messageSource = new ReloadableResourceBundleMessageSource();
        messageSource.setBasenames(
                "classpath:/egovframework/message/messages",
                "classpath:/egovframework/message/com/message-common",
                "classpath:/egovframework/message/com/message-validation",
                "classpath:/org/egovframe/rte/fdl/idgnr/messages/idgnr",
                "classpath:/org/egovframe/rte/fdl/property/messages/properties");
        messageSource.setDefaultEncoding("UTF-8");
        messageSource.setCacheSeconds(60);
        return messageSource;
    }

    @Bean
    public nuri.foundation.core.config.ApplicationContextProvider applicationContextProvider() {
        return new nuri.foundation.core.config.ApplicationContextProvider();
    }

    // [§2.A D3(a)(b) 정정 2026-07-17] egovBBSMstr/Blog/AnswerNo/StsfdgNo IdGnr 4빈 + strategy 4빈 제거.
    // 근거(db-bridge 실측): ① setTable("COMTECOPSEQ") 인데 COMTECOPSEQ 테이블 실물 부재(채번 시 실패).
    //   ② egovBBSMstrIdGnrService 는 foundation EgovIdGnrConfig(ids/BBSMSTR_/12)가 승자(DB PK 실값
    //      BBSMSTR_000000002050 = 12자리로 증명) → LegacyConfig 정의(BBS_ID/20)는 패자·중복.
    //   ③ Blog/AnswerNo/StsfdgNo 는 소비처 0(死빈). BoardMasterService @Qualifier("egovBBSMstrIdGnrService")
    //      는 foundation 정의로 정상 해소. (@Profile("!test") 라 전체 테스트 미로드 — prod-boot 확인은 별도.)
}
