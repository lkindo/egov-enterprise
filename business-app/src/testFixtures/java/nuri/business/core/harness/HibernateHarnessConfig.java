package nuri.business.core.harness;

import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot JPA / Hibernate 설정에 StatementInspector를 자동 동적 연동하는 설정 클래스 (테스트용 피스처)
 */
@Configuration
public class HibernateHarnessConfig {

    @Bean
    public HibernatePropertiesCustomizer hibernatePropertiesCustomizer(HibernateQueryCounterInspector inspector) {
        return hibernateProperties -> hibernateProperties.put("hibernate.session_factory.statement_inspector", inspector);
    }
}
