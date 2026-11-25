package nuri.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicInteger;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import nuri.business.service.user.RrnoReencryptionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.support.GenericApplicationContext;

@DisplayName("주민등록번호 재암호화 실행기")
class RrnoReencryptionRunnerTest {

    private int exitCodeFor(boolean apply, RrnoReencryptionService service) {
        AtomicInteger exited = new AtomicInteger(-1);
        GenericApplicationContext context = new GenericApplicationContext();
        context.refresh();
        new RrnoReencryptionRunner(service, context, apply, exited::set).run(new DefaultApplicationArguments());
        return exited.get();
    }

    @Test
    @DisplayName("성공하면 0, 그 사이 바뀐 행이 있으면 2, 멈추거나 실패하면 1 로 끝난다 — 넘긴 apply 를 그대로 쓴다")
    void exitCodesFollowTheResult() {
        RrnoReencryptionService clean = mock(RrnoReencryptionService.class);
        when(clean.run(false)).thenReturn(new RrnoReencryptionService.Result(3, 0, 0, false));
        assertThat(exitCodeFor(false, clean)).isZero();

        RrnoReencryptionService raced = mock(RrnoReencryptionService.class);
        when(raced.run(true)).thenReturn(new RrnoReencryptionService.Result(3, 2, 1, true));
        assertThat(exitCodeFor(true, raced)).isEqualTo(2);

        RrnoReencryptionService stopped = mock(RrnoReencryptionService.class);
        when(stopped.run(true)).thenThrow(new RrnoReencryptionService.ReencryptionStopped("keyring missing"));
        assertThat(exitCodeFor(true, stopped)).isEqualTo(1);

        RrnoReencryptionService failing = mock(RrnoReencryptionService.class);
        when(failing.run(true)).thenThrow(new IllegalStateException("boom"));
        assertThat(exitCodeFor(true, failing)).isEqualTo(1);
    }

    @Test
    @DisplayName("🚨 rrno-reencrypt 프로필은 웹 서버·Flyway·예약 작업·내구 작업을 끈다 — 점검이 스키마를 바꾸거나 메일·삭제 작업을 돌리지 않게")
    void profileSwitchesOffEverythingButTheBatch() {
        var yaml = new org.springframework.beans.factory.config.YamlPropertiesFactoryBean();
        yaml.setResources(new org.springframework.core.io.ClassPathResource("application-rrno-reencrypt.yml"));
        java.util.Properties properties = yaml.getObject();
        assertThat(properties).isNotNull();
        assertThat(properties).containsEntry("spring.main.web-application-type", "none")
                .containsEntry("spring.flyway.enabled", false)
                .containsEntry("nuri.scheduling.enabled", false)
                .containsEntry("nuri.durable-work.enabled", false)
                .containsEntry("nuri.attachment.integrity.enabled", false);
    }

    @Test
    @DisplayName("🚨 멈춤 사유(건수·행 식별자)는 남기고, 그 밖의 예외 메시지(DB 오류 원문 — 행의 값을 담을 수 있다)는 남기지 않는다")
    void logsOnlyOwnStopMessagesNotForeignExceptionText() {
        Logger logger = (Logger) LoggerFactory.getLogger(RrnoReencryptionRunner.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            RrnoReencryptionService stopped = mock(RrnoReencryptionService.class);
            when(stopped.run(true)).thenThrow(new RrnoReencryptionService.ReencryptionStopped("2 stored value(s) [U1, U2]"));
            exitCodeFor(true, stopped);

            RrnoReencryptionService failing = mock(RrnoReencryptionService.class);
            when(failing.run(true)).thenThrow(new IllegalStateException("Detail: Key (user_enrrno)=(900101-1234567) already exists"));
            exitCodeFor(true, failing);
        } finally {
            logger.detachAppender(appender);
        }

        String logged = String.join("\n", appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList());
        assertThat(logged).contains("[U1, U2]").contains(IllegalStateException.class.getName())
                .doesNotContain("900101-1234567").doesNotContain("already exists");
        assertThat(appender.list).allSatisfy(event -> assertThat(event.getThrowableProxy()).isNull());
    }
}
