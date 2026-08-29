package nuri.business.service.log;

import nuri.business.domain.log.LoginLog;
import nuri.business.domain.log.LoginLogRepository;
import nuri.business.service.log.dto.LoginLogDto;
import nuri.business.domain.common.BaseSearchDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
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

    @Test
    @DisplayName("로그인 로그 등록은 클라이언트 식별자를 무시하고 DB 자동 채번을 사용한다")
    void insertUsesDatabaseGeneratedIdentifier() {
        LoginLogDto dto = LoginLogDto.builder()
                .lgnSn(999L)
                .loginId("user01")
                .loginIp("127.0.0.1")
                .loginMthd("LOGIN")
                .errOccrrAt("N")
                .build();

        loginLogManageService.logInsertLoginLog(dto);

        ArgumentCaptor<LoginLog> captor = ArgumentCaptor.forClass(LoginLog.class);
        verify(loginLogRepository).save(captor.capture());
        assertNull(captor.getValue().getLgnSn());
        assertEquals("user01", captor.getValue().getUserId());
    }

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
                    .lgnSn(1L)
                    .userId("user01")
                    .build();
            log1.setCrtDt(LocalDateTime.now());

            Page<LoginLog> page = new PageImpl<>(Arrays.asList(log1));
            when(loginLogRepository.searchLoginLogs(any(), any(), any(), any())).thenReturn(page);

            // When
            List<LoginLogDto> result = loginLogManageService.selectLoginLogList(searchVO);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(1L, result.get(0).getLgnSn());
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
            Long lgnSn = 1L;
            LoginLog log = LoginLog.builder()
                    .lgnSn(lgnSn)
                    .userId("user01")
                    .build();
            log.setCrtDt(LocalDateTime.now());

            when(loginLogRepository.findById(lgnSn)).thenReturn(Optional.of(log));

            // When
            LoginLogDto result = loginLogManageService.selectLoginLogDetail(lgnSn);

            // Then
            assertNotNull(result);
            assertEquals(lgnSn, result.getLgnSn());
            assertEquals("user01", result.getLoginId());
        }

        @Test
        @DisplayName("존재하지 않는 로그인 로그 조회 시 404 도메인 오류")
        void testSelectLoginLog_NotFound() {
            // Given
            Long lgnSn = 999L;
            when(loginLogRepository.findById(lgnSn)).thenReturn(Optional.empty());

            nuri.foundation.core.exception.BusinessException error =
                    assertThrows(nuri.foundation.core.exception.BusinessException.class,
                            () -> loginLogManageService.selectLoginLogDetail(lgnSn));

            assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND,
                    error.getErrorCode());
        }
    }
}
