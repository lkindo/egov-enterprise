package nuri.business.service.mail;

import nuri.TestApplication;
import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import nuri.foundation.security.config.TestSecurityConfig;
import nuri.foundation.core.config.TestMessagingConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * 외부 API 연동 장애 회복탄력성(Fault Tolerance & Resilience) 정밀 검증 통합 테스트
 * - 외부 SMTP 메일 서버 장애 상황을 인위적으로 모사하여 Spring Retry AOP가 작동하는지 검증합니다.
 * - 최대 3회 재시도(2초 간격 백오프)가 안전하게 수행되는지 검증합니다.
 * - 모든 재시도 실패 시 @Recover 복구 메서드가 자동으로 개입하여 데이터베이스에 최종 실패 상태('F')를 올바르게 각인하는지 실증합니다.
 */
@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class, MailResilienceIntegrationTest.TestExecutorConfig.class })
@ActiveProfiles("test")
class MailResilienceIntegrationTest {

    @org.springframework.boot.test.context.TestConfiguration
    static class TestExecutorConfig {
        @org.springframework.context.annotation.Bean(name = "taskExecutor")
        public java.util.concurrent.Executor taskExecutor() {
            org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor executor = 
                new org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor();
            executor.setCorePoolSize(2);
            executor.setMaxPoolSize(5);
            executor.setQueueCapacity(100);
            executor.setThreadNamePrefix("TestMailAsync-");
            executor.initialize();
            return executor;
        }
    }

    @Autowired
    private MailAsyncProcessor mailAsyncProcessor;

    @Autowired
    private SentMailRepository sentMailRepository;

    @MockitoBean
    private EmailSender emailSender;

    private String testMssageId;

    @AfterEach
    void tearDown() {
        if (testMssageId != null) {
            sentMailRepository.deleteById(testMssageId);
        }
    }

    @Test
    @DisplayName("회복탄력성 검증 - 외부 연동 장애 시 3회 연속 재시도 작동 및 최종 복구(Recover) 실패 기록 각인 보증")
    void mailDispatch_resilienceAndRetryPolicy_verified() throws Exception {
        // Given: 1. 인위적으로 외부 SMTP 서버 다운(장애) 상태 모사
        doThrow(new RuntimeException("SMTP Connection Timeout (External Service Down)"))
                .when(emailSender).send(anyString(), anyString(), anyString(), anyString());

        // Given: 2. 테스트용 메일 영속 데이터 준비 (초기 상태는 대기 'W')
        testMssageId = "MSG_" + UUID.randomUUID().toString().substring(0, 10);
        SentMail sentMail = SentMail.builder()
                .mssageId(testMssageId)
                .sndngResultCode("W") // Waiting / Ready
                .sj("보안 경고 메일")
                .emailCn("서버 온도가 80도를 초과했습니다.")
                .dsptchPerson("admin@egov.com")
                .recptnPerson("ops@egov.com")
                .sndngDe(LocalDateTime.now())
                .build();
        sentMailRepository.saveAndFlush(sentMail);

        // When: 비동기 발송 프로세스 호출 (AOP 프록시를 통해 비동기로 처리됨)
        mailAsyncProcessor.processSending(
                testMssageId, 
                sentMail.getSj(), 
                sentMail.getEmailCn(), 
                sentMail.getDsptchPerson(), 
                sentMail.getRecptnPerson()
        );

        // Then: 1. Awaitility를 사용하여 최대 10초 대기하며 @Recover에 의해 상태가 최종 실패('F')로 갱신될 때까지 폴링 검증
        // (1차 시도: 0초, 2차 시도: 2초 백오프, 3차 시도: 4초 백오프 후 실패 -> 약 6~8초 소요 예상)
        await()
            .atMost(10, TimeUnit.SECONDS)
            .pollInterval(500, TimeUnit.MILLISECONDS)
            .untilAsserted(() -> {
                SentMail processedMail = sentMailRepository.findById(testMssageId)
                        .orElseThrow(() -> new AssertionError("메일 이력이 삭제되었습니다."));
                
                // 최종적으로 3회 재시도가 완전히 끝나고 복구 메서드가 실행되었음을 의미하는 실패('F') 상태 검증
                assertThat(processedMail.getSndngResultCode())
                        .withFailMessage("회복탄력성 재시도 및 복구 처리가 완료되지 않았습니다. 현재 상태: %s", processedMail.getSndngResultCode())
                        .isEqualTo("F");
            });

        // Then: 2. 실제로 외부 메일 서버로 발송 시도가 정확히 3회(초기 1회 + 재시도 2회) 진행되었는지 호출 횟수 검증
        verify(emailSender, times(3)).send(anyString(), anyString(), anyString(), anyString());
    }
}
