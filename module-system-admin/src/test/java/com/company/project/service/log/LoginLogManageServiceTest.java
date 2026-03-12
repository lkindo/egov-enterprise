package com.company.project.service.log;

import com.company.project.domain.log.LoginLog;
import com.company.project.domain.log.LoginLogRepository;
import com.company.project.service.log.dto.LoginLogDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("LoginLogManageService 테스트")
class LoginLogManageServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LoginLogManageService loginLogManageService;

    @Test
    @DisplayName("로그인 로그 목록 조회 성공")
    void selectLoginLogList_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        
        Page<LoginLog> page = new PageImpl<>(List.of(LoginLog.builder().logId("LOG1").loginId("user1").build()));
        given(loginLogRepository.findAll(any(Pageable.class))).willReturn(page);

        // When
        List<LoginLogDto> result = loginLogManageService.selectLoginLogList(searchVO);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("LOG1", result.get(0).getLogId());
    }

    @Test
    @DisplayName("로그인 로그 상세 조회 성공")
    void selectLoginLog_Success() {
        // Given
        LoginLog log = LoginLog.builder().logId("LOG1").loginId("user1").build();
        given(loginLogRepository.findById("LOG1")).willReturn(Optional.of(log));

        // When
        LoginLogDto result = loginLogManageService.selectLoginLog("LOG1");

        // Then
        assertNotNull(result);
        assertEquals("LOG1", result.getLogId());
    }
}
