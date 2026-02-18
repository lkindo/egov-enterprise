package com.company.project.domain.sms;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "spring.main.allow-bean-definition-overriding=true")
@EntityScan("com.company.project.domain")
@EnableJpaRepositories("com.company.project.domain")
class SmsRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private SmsRepository smsRepository;

    @Autowired
    private SmsRecptnRepository smsRecptnRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void saveSms_ShouldPersistSmsAndRecipients() {
        // Given
        String smsId = "SMS_" + System.currentTimeMillis();
        Sms sms = Sms.builder()
                .smsId(smsId)
                .trnsmitTelno("0200000000")
                .trnsmitCn("Test Message")
                .build();

        SmsRecptn recptn1 = SmsRecptn.builder()
                .smsId(smsId)
                .recptnTelno("01011112222")
                .resultCode("9000")
                .resultMssage("Ready")
                .build();

        // When
        smsRepository.save(java.util.Objects.requireNonNull(sms));
        smsRecptnRepository.save(java.util.Objects.requireNonNull(recptn1));
        entityManager.flush();
        entityManager.clear();

        // Then
        Sms savedSms = smsRepository.findById(smsId).orElseThrow();
        assertThat(savedSms).isNotNull();
        // SmsRecptn savedRecptn = savedSms.getRecipients().get(0); // Removed
        // relationship
        SmsRecptn savedRecptn = smsRecptnRepository.findById(new SmsRecptnId(smsId, "01011112222")).orElseThrow();
        assertThat(savedRecptn.getSmsId()).isEqualTo(smsId);
        assertThat(savedRecptn.getRecptnTelno()).isEqualTo("01011112222");
    }

    @Test
    void updateRecipient_ShouldUpdateStatus() {
        // Given
        String smsId = "SMS_UP_" + System.currentTimeMillis();
        Sms sms = Sms.builder()
                .smsId(smsId)
                .trnsmitTelno("0200000000")
                .trnsmitCn("Test Message")
                .build();

        SmsRecptn recptn1 = SmsRecptn.builder()
                .smsId(smsId)
                .recptnTelno("01011112222")
                .resultCode("9000")
                .resultMssage("Ready")
                .build();

        smsRepository.save(java.util.Objects.requireNonNull(sms));
        smsRecptnRepository.save(java.util.Objects.requireNonNull(recptn1));
        entityManager.flush();
        entityManager.clear();

        // When
        // Sms loadedSms = smsRepository.findById(smsId).orElseThrow();
        // SmsRecptn loadedRecptn = loadedSms.getRecipients().get(0);
        SmsRecptn loadedRecptn = smsRecptnRepository.findById(new SmsRecptnId(smsId, "01011112222")).orElseThrow();
        loadedRecptn.updateResult("0000", "SUCCESS");

        entityManager.flush();
        entityManager.clear();

        // Then
        // Sms finalSms = smsRepository.findById(smsId).orElseThrow();
        // SmsRecptn finalRecptn = finalSms.getRecipients().get(0);
        SmsRecptn finalRecptn = smsRecptnRepository.findById(new SmsRecptnId(smsId, "01011112222")).orElseThrow();
        assertThat(finalRecptn.getResultCode()).isEqualTo("0000");
        assertThat(finalRecptn.getResultMssage()).isEqualTo("SUCCESS");
    }
}
