package nuri.business.service.log;

import nuri.business.domain.log.LoginLog;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.service.log.dto.LogDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LogService Unit Test")
class LogServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LogService logService;

    @Nested
    @DisplayName("Log login records test")
    class LogLoginTests {

        @Test
        @DisplayName("Log login records success")
        void testLogLogin_Success() {
            // Given
            String userId = "user01";
            String ip = "127.0.0.1";
            String mthd = "LOGIN";
            String errAt = "N";
            String errCode = "000";

            // When
            logService.logLogin(userId, ip, mthd, errAt, errCode);

            // Then
            ArgumentCaptor<LoginLog> captor = ArgumentCaptor.forClass(LoginLog.class);
            verify(loginLogRepository, times(1)).save(captor.capture());
            
            LoginLog savedLog = captor.getValue();
            assertNull(savedLog.getLgnSn(), "신규 로그인 로그 PK는 DB IDENTITY가 생성해야 한다");
            assertEquals(userId, savedLog.getUserId());
            assertEquals(ip, savedLog.getLgnIpAddr());
            assertEquals(mthd, savedLog.getCntnMthdCd());
            assertEquals(errAt, savedLog.getErrOcrnYn());
            assertEquals(errCode, savedLog.getErrCd());
        }

        @Test
        @DisplayName("[2026-11-14] 저장 실패는 로그인을 막지 않고 유실 수와 메트릭으로 남는다")
        void testLogLogin_CountsDrops() {
            var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
            @SuppressWarnings("unchecked")
            org.springframework.beans.factory.ObjectProvider<io.micrometer.core.instrument.MeterRegistry> provider =
                    mock(org.springframework.beans.factory.ObjectProvider.class);
            when(provider.getIfAvailable()).thenReturn(registry);
            LogService counted = new LogService(loginLogRepository, provider);
            when(loginLogRepository.save(any(LoginLog.class))).thenThrow(new org.springframework.dao.QueryTimeoutException("slow"));

            assertDoesNotThrow(() -> counted.logLogin("user01", "127.0.0.1", "WEB", "N", null));
            assertDoesNotThrow(() -> counted.logLogin("user01", "127.0.0.1", "WEB", "Y", "A005"));

            assertEquals(2, counted.getPersistFailureCount());
            assertEquals(2.0, registry.counter(LogService.DROP_METRIC).count());
            // 레지스트리가 없는 구성에서도 세기만 하고 던지지 않는다.
            assertDoesNotThrow(() -> logService.logLogin("user01", "127.0.0.1", "WEB", "N", null));
            assertEquals(1, logService.getPersistFailureCount());
        }
    }

    @Nested
    @DisplayName("Get recent login logs test")
    class GetRecentLoginLogsTests {

        @Test
        @DisplayName("Get recent login logs success")
        void testGetRecentLoginLogs_Success() {
            // Given
            LoginLog log1 = LoginLog.builder()
                    .lgnSn(1L)
                    .userId("user01")
                    .lgnIpAddr("127.0.0.1")
                    .cntnMthdCd("LOGIN")
                    .build();
            log1.setCrtDt(LocalDateTime.now());

            LoginLog log2 = LoginLog.builder()
                    .lgnSn(2L)
                    .userId("user02")
                    .lgnIpAddr("127.0.0.1")
                    .cntnMthdCd("LOGIN")
                    .build();
            log2.setCrtDt(LocalDateTime.now().minusMinutes(1));

            when(loginLogRepository.findTop100ByOrderByCrtDtDesc()).thenReturn(Arrays.asList(log1, log2));

            // When
            List<LogDto> result = logService.getRecentLoginLogs();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals(1L, result.get(0).getLgnSn());
            assertEquals("user01", result.get(0).getConectId());
            assertEquals(2L, result.get(1).getLgnSn());
            assertEquals("user02", result.get(1).getConectId());
            verify(loginLogRepository, times(1)).findTop100ByOrderByCrtDtDesc();
        }

        @Test
        @DisplayName("Get recent login logs returns empty list when no logs")
        void testGetRecentLoginLogs_Empty() {
            // Given
            when(loginLogRepository.findTop100ByOrderByCrtDtDesc()).thenReturn(List.of());

            // When
            List<LogDto> result = logService.getRecentLoginLogs();

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }
}
