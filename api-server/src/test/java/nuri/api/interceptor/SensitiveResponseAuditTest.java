package nuri.api.interceptor;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.net.ClientIpResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.AbstractResource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SensitiveResponseAuditTest {
    private final SensitiveAuditPort audit = mock(SensitiveAuditPort.class);
    private final SensitiveController controller = new SensitiveController();
    private SensitiveAuditInterceptor interceptor;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        @SuppressWarnings("unchecked")
        ObjectProvider<RequestMappingHandlerMapping> mappings = mock(ObjectProvider.class);
        interceptor = new SensitiveAuditInterceptor(audit, new ClientIpResolver("127.0.0.1/32"), mappings);
        var factory = new AspectJProxyFactory(controller);
        factory.addAspect(new SensitiveResponseAuditAspect(audit));
        Object controllerProxy = factory.getProxy();
        mvc = MockMvcBuilders.standaloneSetup(controllerProxy).addInterceptors(interceptor)
                .addFilters(new SensitiveAuditResponseFilter()).setControllerAdvice(new SafeFailureHandler()).build();
    }

    @Test
    void preparationFailureSendsNoSensitiveJson() throws Exception {
        doThrow(unavailable()).when(audit).prepared(any());
        mvc.perform(get("/api/audit-test/json")).andExpect(status().isServiceUnavailable())
                .andExpect(content().string("audit unavailable"));
        verify(audit).attempted(any());
        verify(audit).completed(any(), eq(SensitiveAuditPort.Outcome.FAILED), eq(503));
        verify(audit, never()).completed(any(), eq(SensitiveAuditPort.Outcome.SUCCEEDED), anyInt());
    }

    @Test
    void preparationFailureNeverOpensFileResource() throws Exception {
        doThrow(unavailable()).when(audit).prepared(any());
        mvc.perform(get("/api/audit-test/file")).andExpect(status().isServiceUnavailable());
        assertThat(controller.sourceOpened.get()).isFalse();
    }

    @Test
    void preparationFailureNeverStartsStreamingExport() throws Exception {
        doThrow(unavailable()).when(audit).prepared(any());
        mvc.perform(get("/api/audit-test/export")).andExpect(status().isServiceUnavailable())
                .andExpect(request().asyncNotStarted());
        assertThat(controller.streamStarted.get()).isFalse();
    }

    @Test
    void attemptedFailureNeverInvokesSensitiveHandler() throws Exception {
        doThrow(unavailable()).when(audit).attempted(any());
        mvc.perform(get("/api/audit-test/json")).andExpect(status().isServiceUnavailable());
        assertThat(controller.handlerInvoked.get()).isFalse();
        verify(audit, never()).prepared(any());
    }

    @Test
    void successfulAsyncResponseRecordsOnePreparationAndCompletion() throws Exception {
        var started = mvc.perform(get("/api/audit-test/export")).andExpect(request().asyncStarted()).andReturn();
        mvc.perform(asyncDispatch(started)).andExpect(status().isOk()).andExpect(content().string("SENSITIVE_SENTINEL"));
        verify(audit, times(1)).attempted(any());
        verify(audit, times(1)).prepared(any());
        verify(audit, times(1)).completed(any(), eq(SensitiveAuditPort.Outcome.SUCCEEDED), eq(200));
    }

    @Test
    void disconnectCannotBeRecordedAsSuccess() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/audit-test/file");
        var response = new MockHttpServletResponse();
        var method = new HandlerMethod(controller, SensitiveController.class.getMethod("file"));
        interceptor.preHandle(request, response, method);
        interceptor.afterCompletion(request, response, method, new IOException("disconnected"));
        verify(audit).completed(any(), eq(SensitiveAuditPort.Outcome.INTERRUPTED), eq(500));
        verify(audit, never()).completed(any(), eq(SensitiveAuditPort.Outcome.SUCCEEDED), anyInt());
    }

    @Test
    void terminalWriterFailurePreservesAttemptWithoutFabricatingSuccess() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/audit-test/file");
        var response = new MockHttpServletResponse();
        response.setStatus(403);
        var method = new HandlerMethod(controller, SensitiveController.class.getMethod("file"));
        interceptor.preHandle(request, response, method);
        doThrow(unavailable()).when(audit).completed(any(), any(), anyInt());
        interceptor.afterCompletion(request, response, method, null);
        verify(audit).attempted(any());
        verify(audit).completed(any(), eq(SensitiveAuditPort.Outcome.DENIED), eq(403));
        verify(audit, never()).prepared(any());
    }

    @Test
    void consumedOutputFailureCannotBecomeASuccessfulCompletion() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/audit-test/file");
        var response = mock(jakarta.servlet.http.HttpServletResponse.class);
        when(response.getStatus()).thenReturn(200);
        var output = mock(jakarta.servlet.ServletOutputStream.class);
        when(response.getOutputStream()).thenReturn(output);
        doThrow(new IOException("closed connection")).when(output).write(anyInt());
        var method = new HandlerMethod(controller, SensitiveController.class.getMethod("file"));
        interceptor.preHandle(request, response, method);
        new SensitiveAuditResponseFilter().doFilter(request, response, (req, res) -> {
            try { res.getOutputStream().write(1); } catch (IOException consumed) { /* Resolver already consumed it. */ }
            interceptor.afterCompletion(request, response, method, null);
        });
        verify(audit).completed(any(), eq(SensitiveAuditPort.Outcome.INTERRUPTED), eq(200));
        verify(audit, never()).completed(any(), eq(SensitiveAuditPort.Outcome.SUCCEEDED), anyInt());
    }

    @Test
    void securityFilterDenialResolvesTheDeclaredHandlerIncludingImplicitHead() {
        @SuppressWarnings("unchecked")
        ObjectProvider<RequestMappingHandlerMapping> mappings = mock(ObjectProvider.class);
        var webContext = java.util.Objects.requireNonNull(mvc.getDispatcherServlet().getWebApplicationContext());
        when(mappings.getIfAvailable()).thenReturn(webContext.getBean(RequestMappingHandlerMapping.class));
        var guard = new SensitiveAuditInterceptor(audit, new ClientIpResolver("127.0.0.1/32"), mappings);
        guard.securityDenied(new nuri.foundation.core.event.AuditEvent("/api/audit-test/file", "HEAD", 403,
                "ANONYMOUS", null, "127.0.0.1", 0L, java.time.LocalDateTime.now(), null, null));
        verify(audit).attempted(any());
        verify(audit).completed(any(), eq(SensitiveAuditPort.Outcome.DENIED), eq(403));
        verify(audit, never()).prepared(any());
    }

    private BusinessException unavailable() { return new BusinessException(CommonErrorCode.SERVER_OVERLOAD, "audit unavailable"); }

    @org.springframework.context.annotation.Profile("sensitive-audit-standalone-fixture")
    @RestController
    public static class SensitiveController {
        final AtomicBoolean handlerInvoked = new AtomicBoolean();
        final AtomicBoolean sourceOpened = new AtomicBoolean();
        final AtomicBoolean streamStarted = new AtomicBoolean();
        @PrivacyAccess("민감 JSON") @GetMapping("/api/audit-test/json")
        public ResponseEntity<Map<String, String>> json() {
            handlerInvoked.set(true);
            return ResponseEntity.ok(Map.of("value", "SENSITIVE_SENTINEL"));
        }
        @PrivacyAccess("파일") @GetMapping("/api/audit-test/file")
        public ResponseEntity<AbstractResource> file() {
            return ResponseEntity.ok(new AbstractResource() {
                @Override public String getDescription() { return "sentinel"; }
                @Override public InputStream getInputStream() {
                    sourceOpened.set(true);
                    return new ByteArrayInputStream("SENSITIVE_SENTINEL".getBytes(StandardCharsets.UTF_8));
                }
            });
        }
        @PrivacyAccess("로그 다운로드") @GetMapping("/api/audit-test/export")
        public ResponseEntity<StreamingResponseBody> export() {
            return ResponseEntity.ok(output -> {
                streamStarted.set(true);
                output.write("SENSITIVE_SENTINEL".getBytes(StandardCharsets.UTF_8));
            });
        }
    }

    @org.springframework.context.annotation.Profile("sensitive-audit-standalone-fixture")
    @RestControllerAdvice
    static class SafeFailureHandler {
        @ExceptionHandler(BusinessException.class)
        ResponseEntity<String> unavailable() { return ResponseEntity.status(503).body("audit unavailable"); }
    }
}
