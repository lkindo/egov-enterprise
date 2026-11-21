package nuri.business.service.sms;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.domain.sms.Sms;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnRepository;
import nuri.business.domain.sms.SmsRepository;
import nuri.business.security.audit.LoginUserAuditorAware;
import nuri.foundation.core.util.ServiceTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

/** SMS 발송 이력 보존 정리 — 보존 기간이 지난 발송 건과 그 수신자만 지우고, 미설정이면 지우지 않는다(2026-11-21). */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("SmsRetentionScheduler")
class SmsRetentionSchedulerTest {

    @TestConfiguration
    static class QuerydslTestConfig {
        @Bean
        JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
            return new JPAQueryFactory(entityManager);
        }
    }

    @Autowired private SmsRepository smsRepository;
    @Autowired private SmsRecptnRepository recipientRepository;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private EntityManager entityManager;

    @Test
    @DisplayName("보존 기간이 지난 발송 건과 그 수신자를 지우고, 기간 안의 발송 건은 남긴다")
    void purgesOnlyExpiredDispatchesAndTheirRecipients() {
        Sms expired = dispatch("expired", ServiceTime.now().minusMonths(7), "01011112222", "01033334444");
        Sms recent = dispatch("recent", ServiceTime.now().minusMonths(5), "01055556666");

        scheduler(6).purgeExpiredHistory();
        entityManager.clear();

        assertThat(smsRepository.findById(expired.getSmsTrsmSn())).isEmpty();
        assertThat(recipientRepository.findByIdSmsTrsmSn(expired.getSmsTrsmSn())).isEmpty();
        assertThat(smsRepository.findById(recent.getSmsTrsmSn())).isPresent();
        assertThat(recipientRepository.findByIdSmsTrsmSn(recent.getSmsTrsmSn()))
                .extracting(SmsRecptn::getRcptnTelno).containsExactly("01055556666");
    }

    @Test
    @DisplayName("한 묶음보다 많이 쌓여도 한 번의 실행에서 묶음을 이어 지운다")
    void continuesAcrossBatches() {
        LocalDateTime old = ServiceTime.now().minusYears(2);
        for (int i = 0; i < SmsRetentionScheduler.BATCH_SIZE + 3; i++) {
            dispatch("bulk-" + i, old, String.format("010%08d", i));
        }

        scheduler(1).purgeExpiredHistory();
        entityManager.clear();

        assertThat(smsRepository.count()).isZero();
        assertThat(recipientRepository.count()).isZero();
    }

    @Test
    @DisplayName("보존 개월이 1 미만(미설정 0·음수)이면 켜져 있어도 아무것도 지우지 않는다")
    void unsetMonthsDeletesNothing() {
        Sms expired = dispatch("expired", ServiceTime.now().minusYears(3), "01011112222");

        for (int months : new int[] {0, -1}) {
            scheduler(months).purgeExpiredHistory();
        }
        entityManager.clear();

        assertThat(smsRepository.findById(expired.getSmsTrsmSn())).isPresent();
        assertThat(recipientRepository.findByIdSmsTrsmSn(expired.getSmsTrsmSn())).hasSize(1);
    }

    private SmsRetentionScheduler scheduler(int months) {
        SmsRetentionScheduler scheduler = new SmsRetentionScheduler(smsRepository, recipientRepository, transactionManager);
        ReflectionTestUtils.setField(scheduler, "months", months);
        return scheduler;
    }

    private Sms dispatch(String content, LocalDateTime createdAt, String... recipients) {
        Sms sms = smsRepository.saveAndFlush(Sms.builder().sndngTelno("0212345678").sndngCn(content).build());
        for (String recipient : recipients) {
            recipientRepository.saveAndFlush(SmsRecptn.builder().smsTrsmSn(sms.getSmsTrsmSn())
                    .rcptnTelno(recipient).rsltCd("S").build());
        }
        entityManager.createNativeQuery("UPDATE tb_sms_info SET crt_dt = :createdAt WHERE sms_trsm_sn = :id")
                .setParameter("createdAt", createdAt)
                .setParameter("id", sms.getSmsTrsmSn())
                .executeUpdate();
        return sms;
    }
}
