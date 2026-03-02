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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class LoginLogManageServiceTest {

    @Mock
    private LoginLogRepository loginLogRepository;

    @InjectMocks
    private LoginLogManageService loginLogManageService;

    @Test
    @DisplayName("로그인 로그 목록 조회 테스트")
    void selectLoginLogListTest() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);

        LoginLog log = LoginLog.builder()
                .logId("LOG_001")
                .loginId("user01")
                .loginIp("127.0.0.1")
                .build();
        Page<LoginLog> page = new PageImpl<>(List.of(log));

        given(loginLogRepository.findAll(any(Pageable.class))).willReturn(page);

        // When
        List<LoginLogDto> result = loginLogManageService.selectLoginLogList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getLoginId()).isEqualTo("user01");
    }

    @Test
    @DisplayName("로그인 로그 단건 조회 테스트")
    void selectLoginLogTest() {
        // Given
        LoginLog log = LoginLog.builder().logId("LOG_001").loginId("user01").build();
        given(loginLogRepository.findById("LOG_001")).willReturn(Optional.of(log));

        // When
        LoginLogDto result = loginLogManageService.selectLoginLog("LOG_001");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getLogId()).isEqualTo("LOG_001");
    }
}
