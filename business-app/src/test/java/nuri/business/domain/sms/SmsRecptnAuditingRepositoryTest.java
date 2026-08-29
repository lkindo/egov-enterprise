package nuri.business.domain.sms;

import jakarta.persistence.EntityManager;
import com.querydsl.jpa.impl.JPAQueryFactory;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/** 비동기 SMS 결과 갱신에서도 BaseEntity 감사 listener가 실제 영속 컬럼을 채우는지 검증한다. */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("SmsRecptn JPA 감사 컬럼")
class SmsRecptnAuditingRepositoryTest {

    @TestConfiguration
    static class QuerydslTestConfig {
        @Bean
        JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
            return new JPAQueryFactory(entityManager);
        }
    }

    @Autowired
    private SmsRecptnRepository repository;

    @Autowired
    private EntityManager entityManager;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("SecurityContext 없는 비동기 결과 기록은 생성/수정 감사값을 SYSTEM으로 보존한다")
    void asyncResultUpdateAppliesJpaAuditingListener() {
        SecurityContextHolder.clearContext();
        SmsRecptnId id = new SmsRecptnId(991L, "01099990000");
        repository.saveAndFlush(SmsRecptn.builder()
                .smsTrsmSn(991L)
                .rcptnTelno("01099990000")
                .rsltCd("P")
                .build());
        entityManager.clear();

        SmsRecptn created = repository.findById(id).orElseThrow();
        assertThat(created.getFrstRgtrId()).isEqualTo("SYSTEM");
        assertThat(created.getLastMdfrId()).isEqualTo("SYSTEM");
        assertThat(created.getCrtDt()).isNotNull();
        assertThat(created.getMdfcnDt()).isNotNull();

        // listener가 update 시 재기록한다는 것을 값 제거 후 실제 flush/reload로 증명한다.
        created.setLastMdfrId(null);
        created.setMdfcnDt(null);
        created.updateResult("S", "Success");
        repository.saveAndFlush(created);
        entityManager.clear();

        SmsRecptn updated = repository.findById(id).orElseThrow();
        assertThat(updated.getFrstRgtrId()).isEqualTo("SYSTEM");
        assertThat(updated.getLastMdfrId()).isEqualTo("SYSTEM");
        assertThat(updated.getCrtDt()).isNotNull();
        assertThat(updated.getMdfcnDt()).isNotNull();
        assertThat(updated.getRsltCd()).isEqualTo("S");
    }
}
