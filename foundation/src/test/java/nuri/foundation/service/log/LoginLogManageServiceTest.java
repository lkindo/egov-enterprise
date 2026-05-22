package nuri.foundation.service.log;

import nuri.foundation.domain.log.LoginLog;
import nuri.foundation.domain.log.LoginLogRepository;
import nuri.foundation.service.log.dto.LoginLogDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoginLogManageService (로그인 로그 관리) 테스트")
class LoginLogManageServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LoginLogManageService loginLogManageService;

    @Nested
    @DisplayName("로그인 로그 조회 테스트")
    class SelectLoginLogTests {

        @Test
        @DisplayName("로그인 로그 목록 조회 성공")
        void testSelectLoginLogList_Success() {
            // Given
            BaseSearchDto searchVO = new BaseSearchDto();
            searchVO.setPageIndex(1);
            searchVO.setPageUnit(10);

            LoginLog log1 = LoginLog.builder()
                    .logId("LGN_001")
                    .userId("user01")
                    .crtDt(LocalDateTime.now())
                    .build();

            Page<LoginLog> page = new PageImpl<>(Arrays.asList(log1));
            when(loginLogRepository.searchLoginLogs(any(), any(), any(), any())).thenReturn(page);

            // When
            List<LoginLogDto> result = loginLogManageService.selectLoginLogList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals("LGN_001", result.get(0).getLogId());
            assertEquals("user01", result.get(0).getLoginId());
        }

        @Test
        @DisplayName("로그인 로그 총 갯수 조회 성공")
        void testSelectLoginLogListTotCnt_Success() {
            // Given
            Page<LoginLog> page = new PageImpl<>(List.of());
            when(loginLogRepository.searchLoginLogs(any(), any(), any(), any())).thenReturn(page);

            // When
            int count = loginLogManageService.selectLoginLogListTotCnt(new BaseSearchDto());

            // Then
            assertEquals(0, count);
        }

        @Test
        @DisplayName("로그인 로그 상세 조회 성공")
        void testSelectLoginLog_Success() {
            // Given
            String logId = "LGN_001";
            LoginLog log = LoginLog.builder()
                    .logId(logId)
                    .userId("user01")
                    .crtDt(LocalDateTime.now())
                    .build();

            when(loginLogRepository.findById(logId)).thenReturn(Optional.of(log));

            // When
            LoginLogDto result = loginLogManageService.selectLoginLogDetail(LoginLogDto.builder().logId(logId).build());

            // Then
            assertNotNull(result);
            assertEquals(logId, result.getLogId());
            assertEquals("user01", result.getLoginId());
        }

        @Test
        @DisplayName("존재하지 않는 로그인 로그 조회 시 null 반환")
        void testSelectLoginLog_NotFound() {
            // Given
            String logId = "NON_EXIST";
            when(loginLogRepository.findById(logId)).thenReturn(Optional.empty());

            // When
            LoginLogDto result = loginLogManageService.selectLoginLogDetail(LoginLogDto.builder().logId(logId).build());

            // Then
            assertNull(result);
        }
    }
}
