package nuri.business.domain.operation;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 할당형 복합키 엔티티가 생성 경계에서 {@code merge}로 기존 행을 덮어쓰지 않는지 검증한다.
 */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@DisplayName("ExternalHr 할당형 복합키 저장 계약")
class ExternalHrAssignedIdPersistenceTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
            return new JPAQueryFactory(entityManager);
        }
    }

    @Autowired
    private ExternalHrRepository externalHrRepository;

    @Autowired
    private EventInfoRepository eventInfoRepository;

    @Test
    @DisplayName("같은 복합키의 두 번째 신규 저장은 UPDATE가 아니라 PK 충돌로 거부된다")
    void duplicateAssignedIdCannotOverwriteExistingRow() {
        EventInfo event = eventInfoRepository.saveAndFlush(EventInfo.builder()
                .evntNm("Persistence boundary event")
                .build());
        ExternalHrId id = new ExternalHrId(event.getEvntSn(), "HR_DUPLICATE");
        externalHrRepository.saveAndFlush(ExternalHr.builder()
                .evntSn(event.getEvntSn())
                .otsdHrId("HR_DUPLICATE")
                .otsdHrNm("Original name")
                .frstRgtrId("original_creator")
                .lastMdfrId("original_modifier")
                .build());

        ExternalHr duplicate = ExternalHr.builder()
                .evntSn(event.getEvntSn())
                .otsdHrId("HR_DUPLICATE")
                .otsdHrNm("Overwrite attempt")
                .frstRgtrId("replacement_creator")
                .lastMdfrId("replacement_modifier")
                .build();

        assertThatThrownBy(() -> externalHrRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);

        ExternalHr persisted = externalHrRepository.findById(id).orElseThrow();
        assertThat(persisted.getOtsdHrNm()).isEqualTo("Original name");
        assertThat(persisted.getFrstRgtrId()).isEqualTo("original_creator");
        assertThat(persisted.getLastMdfrId()).isEqualTo("original_modifier");
    }
}
