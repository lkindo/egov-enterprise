package com.company.project.service.log;

import com.company.project.domain.log.SysLog;
import com.company.project.domain.log.SysLogRepository;
import com.company.project.service.log.dto.SysLogDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class LogManageServiceTest {

    @Mock
    private SysLogRepository sysLogRepository;

    @InjectMocks
    private LogManageService logManageService;

    private SysLog testLog;

    @BeforeEach
    void setUp() {
        testLog = SysLog.builder()
                .requstId("REQ_001")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .processSeCode("C")
                .processTime("100")
                .rqesterId("testuser")
                .rqesterIp("127.0.0.1")
                .occrrncDe("20260311")
                .build();
    }

    @Test
    @DisplayName("시스템 로그 등록 테스트")
    void insertSysLog_success() {
        // given
        SysLogDto dto = SysLogDto.builder()
                .requstId("REQ_001")
                .srvcNm("TestService")
                .methodNm("testMethod")
                .processSeCode("C")
                .processTime("100")
                .rqesterId("testuser")
                .rqesterIp("127.0.0.1")
                .build();

        // when
        logManageService.insertSysLog(dto);

        // then
        verify(sysLogRepository).save(any(SysLog.class));
    }

    @Test
    @DisplayName("시스템 로그 목록 조회 테스트")
    void selectSysLogList_success() {
        // given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);
        searchVO.setSearchKeyword("Test");

        Page<SysLog> page = new PageImpl<>(Arrays.asList(testLog), PageRequest.of(0, 10), 1);
        given(sysLogRepository.searchSysLogs(eq("Test"), any(), any(), any(Pageable.class))).willReturn(page);

        // when
        List<SysLogDto> result = logManageService.selectSysLogList(searchVO);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRequstId()).isEqualTo("REQ_001");
        verify(sysLogRepository).searchSysLogs(eq("Test"), any(), any(), any(Pageable.class));
    }

    @Test
    @DisplayName("시스템 로그 상세 조회 테스트")
    void selectSysLog_success() {
        // given
        given(sysLogRepository.findById("REQ_001")).willReturn(Optional.of(testLog));

        // when
        SysLogDto result = logManageService.selectSysLog("REQ_001");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getSrvcNm()).isEqualTo("TestService");
        verify(sysLogRepository).findById("REQ_001");
    }

    @Test
    @DisplayName("시스템 로그 총 개수 조회 테스트")
    void selectSysLogListTotCnt_success() {
        // given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("Test");

        Page<SysLog> page = new PageImpl<>(Arrays.asList(testLog), PageRequest.of(0, 1), 1);
        given(sysLogRepository.searchSysLogs(eq("Test"), any(), any(), any(Pageable.class))).willReturn(page);

        // when
        int count = logManageService.selectSysLogListTotCnt(searchVO);

        // then
        assertThat(count).isEqualTo(1);
    }
}
