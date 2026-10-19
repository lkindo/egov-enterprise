package nuri.business.domain.deptjob;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * [2026-10-18 V2_133] 부서 업무의 낙관적 잠금 버전이 저장과 벌크 담당자 해제에서 오르는지 본다.
 *
 * <p>벌크 UPDATE 는 {@code @Version} 을 올리지 않는다. 사용자를 지울 때 담당자를 비우는 {@code releasePicByPicIdIn} 이
 * 버전을 그대로 두면, 그 전에 업무를 연 화면이 바뀐 담당자를 모른 채 옛 버전으로 저장해도 409 가 나지 않는다.
 */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("DeptJobRepository — 낙관적 잠금 버전")
class DeptJobRepositoryVersionTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
            return new JPAQueryFactory(entityManager);
        }
    }

    @Autowired private DeptJobRepository deptJobRepository;
    @Autowired private EntityManager entityManager;

    @Test
    @DisplayName("새 업무는 버전 0 으로 시작하고, 내용을 고쳐 저장하면 1 이 된다")
    void versionStartsAtZeroAndRisesOnEveryFlush() {
        DeptJob saved = deptJobRepository.saveAndFlush(DeptJob.builder().deptTaskNm("점검").picId("ESNTL_A").build());
        assertThat(saved.getVersion()).isZero();

        saved.update(null, "점검(수정)", null, "ESNTL_A", "2", null);
        deptJobRepository.flush();

        assertThat(saved.getVersion()).isOne();
    }

    @Test
    @DisplayName("사용자 삭제의 벌크 담당자 해제는 그 업무의 버전을 올리고, 다른 담당자의 업무는 그대로 둔다")
    void bulkAssigneeReleaseBumpsVersion() {
        DeptJob released = deptJobRepository.saveAndFlush(DeptJob.builder().deptTaskNm("떠난 담당자").picId("ESNTL_GONE").build());
        DeptJob kept = deptJobRepository.saveAndFlush(DeptJob.builder().deptTaskNm("남는 담당자").picId("ESNTL_STAY").build());
        entityManager.clear();

        int affected = deptJobRepository.releasePicByPicIdIn(List.of("ESNTL_GONE"));

        assertThat(affected).isOne();
        DeptJob afterRelease = deptJobRepository.findById(released.getDeptTaskSn()).orElseThrow();
        assertThat(afterRelease.getPicId()).isNull();
        assertThat(afterRelease.getVersion()).as("담당자가 바뀐 업무의 옛 화면 저장은 409 가 되어야 한다").isOne();
        assertThat(deptJobRepository.findById(kept.getDeptTaskSn()).orElseThrow().getVersion()).isZero();
    }
}
