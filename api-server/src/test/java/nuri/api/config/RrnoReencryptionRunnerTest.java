package nuri.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.concurrent.atomic.AtomicInteger;

import nuri.business.service.user.RrnoReencryptionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
    @DisplayName("성공하면 0, 그 사이 바뀐 행이 있으면 2, 실패하면 1 로 끝난다 — 넘긴 apply 를 그대로 쓴다")
    void exitCodesFollowTheResult() {
        RrnoReencryptionService clean = mock(RrnoReencryptionService.class);
        when(clean.run(false)).thenReturn(new RrnoReencryptionService.Result(3, 0, 0, false));
        assertThat(exitCodeFor(false, clean)).isZero();

        RrnoReencryptionService raced = mock(RrnoReencryptionService.class);
        when(raced.run(true)).thenReturn(new RrnoReencryptionService.Result(3, 2, 1, true));
        assertThat(exitCodeFor(true, raced)).isEqualTo(2);

        RrnoReencryptionService failing = mock(RrnoReencryptionService.class);
        when(failing.run(true)).thenThrow(new IllegalStateException("keyring missing"));
        assertThat(exitCodeFor(true, failing)).isEqualTo(1);
    }
}
