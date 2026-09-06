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

    /**
     * [2026-09-06 병합 검토] {@code Persistable}(#568)과 조회-후-삭제 경로(#562, {@code ExternalHrService#deleteExternalHr})가
     * 이 병합에서 처음 결합됐다. {@code SimpleJpaRepository#delete}는 {@code isNew()}가 참이면 <b>조용히 아무것도 하지 않으므로</b>,
     * {@code @PostLoad}가 신규 표시를 내리지 않으면 관리자 삭제가 200 success 로 응답하면서 행은 남는다. 단위 테스트(mock)는
     * 이 축을 볼 수 없어 실행 증거를 여기 남긴다.
     */
    @Test
    @DisplayName("조회로 얻은 엔티티는 isNew 가 아니므로 delete 가 무시되지 않고 실제로 행을 지운다")
    void loadedEntityIsActuallyDeleted() {
        EventInfo event = eventInfoRepository.saveAndFlush(EventInfo.builder()
                .evntNm("Persistence delete boundary event")
                .build());
        ExternalHrId id = new ExternalHrId(event.getEvntSn(), "HR_DELETE");
        externalHrRepository.saveAndFlush(ExternalHr.builder()
                .evntSn(event.getEvntSn())
                .otsdHrId("HR_DELETE")
                .otsdHrNm("To be deleted")
                .frstRgtrId("creator")
                .lastMdfrId("modifier")
                .build());

        ExternalHr loaded = externalHrRepository.findById(id).orElseThrow();
        assertThat(loaded.isNew())
                .as("@PostLoad 가 신규 표시를 내려야 SimpleJpaRepository#delete 가 삭제를 건너뛰지 않는다")
                .isFalse();

        externalHrRepository.delete(loaded);

        assertThat(externalHrRepository.existsById(id)).isFalse();
    }
}
