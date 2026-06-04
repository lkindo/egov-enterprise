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
            assertNotNull(savedLog.getLogId());
            assertTrue(savedLog.getLogId().startsWith("LGN_"));
            assertEquals(userId, savedLog.getUserId());
            assertEquals(ip, savedLog.getLgnIpAddr());
            assertEquals(mthd, savedLog.getCntnMthdCd());
            assertEquals(errAt, savedLog.getErrOcrnYn());
            assertEquals(errCode, savedLog.getErrCd());
            assertNotNull(savedLog.getCrtDt());
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
                    .logId("LGN_001")
                    .userId("user01")
                    .lgnIpAddr("127.0.0.1")
                    .cntnMthdCd("LOGIN")
                    .crtDt(LocalDateTime.now())
                    .build();

            LoginLog log2 = LoginLog.builder()
                    .logId("LGN_002")
                    .userId("user02")
                    .lgnIpAddr("127.0.0.1")
                    .cntnMthdCd("LOGIN")
                    .crtDt(LocalDateTime.now().minusMinutes(1))
                    .build();

            when(loginLogRepository.findTop100ByOrderByCrtDtDesc()).thenReturn(Arrays.asList(log1, log2));

            // When
            List<LogDto> result = logService.getRecentLoginLogs();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals("LGN_001", result.get(0).getLogId());
            assertEquals("user01", result.get(0).getConectId());
            assertEquals("LGN_002", result.get(1).getLogId());
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
