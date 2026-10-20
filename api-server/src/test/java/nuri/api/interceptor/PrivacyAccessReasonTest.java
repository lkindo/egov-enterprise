package nuri.api.interceptor;

import java.util.concurrent.atomic.AtomicBoolean;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.security.net.ClientIpResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [2026-10-20] 사유를 받는 개인정보 접근({@link PrivacyAccess#reasonParameter()}) — 감사 원장 내보내기가 첫 소비자다.
 *
 * <p>사유가 없으면 원장에 시도도 남기지 않고 핸들러 전에 400 이다. 사유가 있으면 원장의 설명에 실려 시도·응답 준비·완료가 같은
 * 설명을 남긴다(응답 준비는 개인정보 접근 기록으로도 투영된다). 사유를 받지 않는 접근은 종전과 같다.
 */
@DisplayName("개인정보 접근 사유 경계")
class PrivacyAccessReasonTest {

    private final SensitiveAuditPort audit = mock(SensitiveAuditPort.class);
    private final ReasonController controller = new ReasonController();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        @SuppressWarnings("unchecked")
        ObjectProvider<RequestMappingHandlerMapping> mappings = mock(ObjectProvider.class);
        var interceptor = new SensitiveAuditInterceptor(audit, new ClientIpResolver("127.0.0.1/32"), mappings);
        var factory = new AspectJProxyFactory(controller);
        factory.addAspect(new SensitiveResponseAuditAspect(audit));
        Object proxied = factory.getProxy();
        mvc = MockMvcBuilders.standaloneSetup(proxied).addInterceptors(interceptor)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    @DisplayName("사유가 없으면 핸들러를 부르지 않고 원장에도 남기지 않은 채 400 이다")
    void missingReasonIsRejectedBeforeTheLedgerAndHandler() throws Exception {
        mvc.perform(get("/api/reason-test/export")).andExpect(status().isBadRequest());

        assertThat(controller.invoked.get()).isFalse();
        verify(audit, never()).attempted(any());
        verify(audit, never()).prepared(any());
        verify(audit, never()).completed(any(), any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "가", "\t\n"})
    @DisplayName("빈 사유·한 글자 사유는 형식적 입력이라 받지 않는다")
    void blankOrTooShortReasonIsRejected(String reason) throws Exception {
        mvc.perform(get("/api/reason-test/export").param("reason", reason)).andExpect(status().isBadRequest());

        assertThat(controller.invoked.get()).isFalse();
        verify(audit, never()).attempted(any());
    }

    @Test
    @DisplayName("상한을 넘는 사유는 받지 않는다")
    void overlongReasonIsRejected() throws Exception {
        String overlong = "가".repeat(SensitiveAuditInterceptor.REASON_MAX_LENGTH + 1);

        mvc.perform(get("/api/reason-test/export").param("reason", overlong)).andExpect(status().isBadRequest());

        verify(audit, never()).attempted(any());
    }

    @Test
    @DisplayName("사유는 원장 설명에 한 줄로 실려 시도·응답 준비·완료가 같은 설명을 남긴다")
    void reasonIsRecordedOnEveryStage() throws Exception {
        mvc.perform(get("/api/reason-test/export").param("reason", "  월간\n점검  ")).andExpect(status().isOk());

        var attempted = ArgumentCaptor.forClass(SensitiveAuditPort.Context.class);
        var prepared = ArgumentCaptor.forClass(SensitiveAuditPort.Context.class);
        var completed = ArgumentCaptor.forClass(SensitiveAuditPort.Context.class);
        verify(audit).attempted(attempted.capture());
        verify(audit).prepared(prepared.capture());
        verify(audit).completed(completed.capture(), eq(SensitiveAuditPort.Outcome.SUCCEEDED), eq(200));
        assertThat(attempted.getValue().description()).isEqualTo("내보내기 — 사유: 월간 점검");
        assertThat(prepared.getValue().description()).isEqualTo("내보내기 — 사유: 월간 점검");
        assertThat(completed.getValue().description()).isEqualTo("내보내기 — 사유: 월간 점검");
        assertThat(controller.invoked.get()).isTrue();
    }

    @Test
    @DisplayName("사유를 받지 않는 개인정보 접근은 종전처럼 사유 없이 남는다")
    void accessWithoutReasonIsUnchanged() throws Exception {
        mvc.perform(get("/api/reason-test/plain")).andExpect(status().isOk());

        var attempted = ArgumentCaptor.forClass(SensitiveAuditPort.Context.class);
        verify(audit).attempted(attempted.capture());
        assertThat(attempted.getValue().description()).isEqualTo("조회");
    }

    @org.springframework.context.annotation.Profile("privacy-access-reason-standalone-fixture")
    @RestController
    public static class ReasonController {
        final AtomicBoolean invoked = new AtomicBoolean();

        @PrivacyAccess(value = "내보내기", reasonParameter = "reason")
        @GetMapping("/api/reason-test/export")
        public ResponseEntity<String> export(@RequestParam(required = false) String reason) {
            invoked.set(true);
            return ResponseEntity.ok("ok");
        }

        @PrivacyAccess("조회")
        @GetMapping("/api/reason-test/plain")
        public ResponseEntity<String> plain() {
            return ResponseEntity.ok("ok");
        }
    }
}
