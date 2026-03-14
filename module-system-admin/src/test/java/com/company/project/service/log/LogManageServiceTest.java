package com.company.project.service.log;

import com.company.project.domain.log.SysLog;
import com.company.project.domain.log.SysLogRepository;
import com.company.project.service.log.dto.SysLogDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("LogManageService 테스트")
class LogManageServiceTest {

    @Mock
    private SysLogRepository sysLogRepository;

    @InjectMocks
    private LogManageService logManageService;

    @Test
    @DisplayName("시스템 로그 등록 성공")
    void insertSysLog_Success() {
        // Given
        SysLogDto dto = SysLogDto.builder()
                .srvcNm("MenuService")
                .methodNm("getMenuHierarchy")
                .processSeCode("R")
                .rqesterId("user1")
                .build();

        // When
        logManageService.insertSysLog(dto);

        // Then
        verify(sysLogRepository).save(any(SysLog.class));
    }

    @Test
    @DisplayName("시스템 로그 목록 조회 성공")
    void selectSysLogList_Success() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setPageSize(10);
        SysLog entity = SysLog.builder().requstId("REQ1").srvcNm("S1").build();
        given(sysLogRepository.searchSysLogs(anyString(), eq(null), eq(null), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(entity)));

        // When
        List<SysLogDto> result = logManageService.selectSysLogList(searchVO);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getRequstId()).isEqualTo("REQ1");
    }

    @Test
    @DisplayName("시스템 로그 상세 조회 성공")
    void selectSysLog_Success() {
        // Given
        SysLog entity = SysLog.builder().requstId("REQ1").build();
        given(sysLogRepository.findById("REQ1")).willReturn(Optional.of(entity));

        // When
        SysLogDto result = logManageService.selectSysLog("REQ1");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getRequstId()).isEqualTo("REQ1");
    }
}
