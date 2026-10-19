package nuri.business.domain.sms;

import jakarta.persistence.EntityManager;
import com.querydsl.jpa.impl.JPAQueryFactory;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
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
    private SmsRepository smsRepository;

    @Autowired
    private EntityManager entityManager;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("숫자로 저장된 수신번호는 하이픈을 포함한 검색어로도 조회된다")
    void findsCanonicalRecipientUsingLegacySearchFormat() {
        Sms sms = smsRepository.saveAndFlush(Sms.builder().sndngTelno("0212345678").sndngCn("search fixture").build());
        repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(sms.getSmsTrsmSn())
                .rcptnTelno("01012345678").rsltCd("P").build());
        var pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        assertThat(smsRepository.searchSms("0", "010-1234-5678", pageable).getContent())
                .extracting(Sms::getSmsTrsmSn).containsExactly(sms.getSmsTrsmSn());
        assertThat(smsRepository.searchSms("0", "1234-5678", pageable).getTotalElements()).isEqualTo(1);
        assertThat(smsRepository.searchSms("0", "9999", pageable).getContent()).isEmpty();
    }

    @Test
    @DisplayName("🔒 다수 수신자 발송 건이 있어도 목록은 발송 건 단위로 쪽을 나눈다 — 겹치거나 밀려 빠지는 건이 없다")
    void pagesByDispatchEvenWithManyRecipients() {
        Sms oldest = dispatch("oldest", "01000000001");
        Sms middle = dispatch("middle", "01000000002");
        // 가장 최근 건이 수신자 셋이다 — 조인 뒤 자르면 첫 쪽을 이 건 하나가 다 차지한다.
        Sms newest = dispatch("newest", "01000000003", "01000000004", "01000000005");

        var firstPage = smsRepository.searchSms(null, null, org.springframework.data.domain.PageRequest.of(0, 2));
        var secondPage = smsRepository.searchSms(null, null, org.springframework.data.domain.PageRequest.of(1, 2));

        assertThat(firstPage.getContent()).extracting(Sms::getSmsTrsmSn)
                .as("첫 쪽은 최신 발송 건 둘이어야 한다")
                .containsExactly(newest.getSmsTrsmSn(), middle.getSmsTrsmSn());
        assertThat(secondPage.getContent()).extracting(Sms::getSmsTrsmSn)
                .as("둘째 쪽은 남은 한 건이어야 한다")
                .containsExactly(oldest.getSmsTrsmSn());
        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
    }

    @Test
    @DisplayName("🔒 수신번호 검색이 한 발송 건의 여러 수신자와 맞아도 쪽은 발송 건 단위다 — 그 건이 쪽을 다 차지하지 않는다")
    void recipientSearchPagesByDispatch() {
        Sms earlier = dispatch("earlier", "01055550009");
        Sms other = dispatch("other", "01099990001");
        // 가장 최근 건의 수신자 셋이 모두 검색어와 맞는다 — 조인 뒤 자르면 첫 쪽을 이 건 하나가 다 차지한다.
        Sms team = dispatch("team", "01055550001", "01055550002", "01055550003");

        var page = smsRepository.searchSms("0", "5555", org.springframework.data.domain.PageRequest.of(0, 2));

        assertThat(page.getContent()).extracting(Sms::getSmsTrsmSn)
                .as("검색에 맞은 발송 건 둘이 첫 쪽에 실려야 한다")
                .containsExactly(team.getSmsTrsmSn(), earlier.getSmsTrsmSn());
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(smsRepository.searchSms("0", "9999", org.springframework.data.domain.PageRequest.of(0, 2))
                .getContent()).extracting(Sms::getSmsTrsmSn).containsExactly(other.getSmsTrsmSn());
    }

    private Sms dispatch(String content, String... recipients) {
        Sms sms = smsRepository.saveAndFlush(Sms.builder().sndngTelno("0212345678").sndngCn(content).build());
        for (String recipient : recipients) {
            repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(sms.getSmsTrsmSn())
                    .rcptnTelno(recipient).rsltCd("S").build());
        }
        return sms;
    }

    @Test
    @DisplayName("발송 건마다 결과 코드별 수신자 수를 한 번에 센다")
    void countsRecipientsByResultPerDispatch() {
        repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(801L).rcptnTelno("01000000001").rsltCd("S").build());
        repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(801L).rcptnTelno("01000000002").rsltCd("S").build());
        repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(801L).rcptnTelno("01000000003").rsltCd("F").build());
        repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(802L).rcptnTelno("01000000004").rsltCd("P").build());
        repository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(803L).rcptnTelno("01000000005").rsltCd("S").build());

        var rows = repository.countByResult(java.util.List.of(801L, 802L));

        assertThat(rows).extracting(r -> r.getSmsTrsmSn() + ":" + r.getRsltCd() + "=" + r.getCnt())
                .containsExactlyInAnyOrder("801:S=2", "801:F=1", "802:P=1");
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
