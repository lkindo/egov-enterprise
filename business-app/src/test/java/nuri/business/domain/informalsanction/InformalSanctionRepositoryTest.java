package nuri.business.domain.informalsanction;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("InformalSanctionRepository 대리결재 질의 테스트")
class InformalSanctionRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private InformalSanctionRepository sanctionRepository;

    @Autowired
    private InformalSanctionDetailRepository detailRepository;

    @Test
    @DisplayName("[Top 1b] 같은 차수에서 이미 대리결재자로 결정한 문서는 위임자 대기함·대기 건수에서 제외된다")
    void findAndCountPendingWithSubstitution_excludeDocumentAlreadySubstituteApprovedInSameCycle() {
        InformalSanction alreadySubstituted = sanctionRepository.saveAndFlush(InformalSanction.builder()
                .taskSeCd("TASK")
                .aplcntId("drafter")
                .reqYmd("20261116")
                .aprvrId("second")
                .aprvYn("A")
                .docTtl("이미 대리결재한 문서")
                .docCn("본문")
                .atrzCycl(BigDecimal.ONE)
                .build());

        InformalSanctionDetail firstSubLine = InformalSanctionDetail.create(
                new InformalSanctionDetailId(alreadySubstituted.getIfmlAtrzSn(), BigDecimal.ONE, BigDecimal.ONE, "first"),
                ApprovalStageKind.APPROVAL, true);
        firstSubLine.decideAsSubstitute("sub", true, "1차 대리 승인", LocalDateTime.of(2026, 11, 16, 10, 0));
        detailRepository.save(firstSubLine);
        detailRepository.save(InformalSanctionDetail.create(
                new InformalSanctionDetailId(alreadySubstituted.getIfmlAtrzSn(), BigDecimal.ONE, BigDecimal.valueOf(2), "second"),
                ApprovalStageKind.APPROVAL, true));

        InformalSanction eligible = sanctionRepository.saveAndFlush(InformalSanction.builder()
                .taskSeCd("TASK")
                .aplcntId("drafter")
                .reqYmd("20261116")
                .aprvrId("second")
                .aprvYn("A")
                .docTtl("대리결재 가능한 위임 문서")
                .docCn("본문")
                .atrzCycl(BigDecimal.ONE)
                .build());

        InformalSanctionDetail otherApproved = InformalSanctionDetail.create(
                new InformalSanctionDetailId(eligible.getIfmlAtrzSn(), BigDecimal.ONE, BigDecimal.ONE, "other"),
                ApprovalStageKind.APPROVAL, true);
        otherApproved.decide(true, "정상 승인", LocalDateTime.of(2026, 11, 16, 10, 5));
        detailRepository.save(otherApproved);
        detailRepository.save(InformalSanctionDetail.create(
                new InformalSanctionDetailId(eligible.getIfmlAtrzSn(), BigDecimal.ONE, BigDecimal.valueOf(2), "second"),
                ApprovalStageKind.APPROVAL, true));
        detailRepository.flush();

        Page<InformalSanction> page = sanctionRepository.findPendingWithSubstitution(
                "sub", List.of("first", "second"), null, null, null, null, PageRequest.of(0, 10));
        long count = sanctionRepository.countPendingWithSubstitution("sub", List.of("first", "second"));

        assertThat(page.getContent())
                .extracting(InformalSanction::getIfmlAtrzSn)
                .containsExactly(eligible.getIfmlAtrzSn());
        assertThat(count).isEqualTo(1L);
    }
}
