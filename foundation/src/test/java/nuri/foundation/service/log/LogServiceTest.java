package nuri.foundation.service.log;

import nuri.foundation.domain.log.LoginLog;
import nuri.foundation.domain.log.LoginLogRepository;
import nuri.foundation.service.log.dto.LogDto;
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
@DisplayName("LogService (공통 로그 서비스) 테스트")
class LogServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LogService logService;

    @Nested
    @DisplayName("로그인 로그 기록 테스트")
    class LogLoginTests {

        @Test
        @DisplayName("로그인 로그 기록 성공")
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
            assertEquals(userId, savedLog.getLoginId());
            assertEquals(ip, savedLog.getLoginIp());
            assertEquals(mthd, savedLog.getLoginMthd());
            assertEquals(errAt, savedLog.getErrOccrrAt());
            assertEquals(errCode, savedLog.getErrorCode());
            assertNotNull(savedLog.getCreatDt());
        }
    }

    @Nested
    @DisplayName("최근 로그인 로그 목록 조회 테스트")
    class GetRecentLoginLogsTests {

        @Test
        @DisplayName("최근 로그인 로그 목록 조회 성공")
        void testGetRecentLoginLogs_Success() {
            // Given
            LoginLog log1 = LoginLog.builder()
                    .logId("LGN_001")
                    .loginId("user01")
                    .loginIp("127.0.0.1")
                    .loginMthd("LOGIN")
                    .creatDt(LocalDateTime.now())
                    .build();

            LoginLog log2 = LoginLog.builder()
                    .logId("LGN_002")
                    .loginId("user02")
                    .loginIp("127.0.0.1")
                    .loginMthd("LOGIN")
                    .creatDt(LocalDateTime.now().minusMinutes(1))
                    .build();

            when(loginLogRepository.findTop100ByOrderByCreatDtDesc()).thenReturn(Arrays.asList(log1, log2));

            // When
            List<LogDto> result = logService.getRecentLoginLogs();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals("LGN_001", result.get(0).getLogId());
            assertEquals("user01", result.get(0).getConectId());
            assertEquals("LGN_002", result.get(1).getLogId());
            assertEquals("user02", result.get(1).getConectId());
            verify(loginLogRepository, times(1)).findTop100ByOrderByCreatDtDesc();
        }

        @Test
        @DisplayName("로그가 없을 때 빈 목록 반환")
        void testGetRecentLoginLogs_Empty() {
            // Given
            when(loginLogRepository.findTop100ByOrderByCreatDtDesc()).thenReturn(List.of());

            // When
            List<LogDto> result = logService.getRecentLoginLogs();

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }
}
