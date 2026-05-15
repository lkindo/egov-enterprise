package nuri.foundation.service.log;

import nuri.foundation.domain.log.SysLog;
import nuri.foundation.domain.log.SysLogRepository;
import nuri.foundation.service.log.dto.SysLogDto;
import nuri.foundation.domain.common.BaseSearchDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("LogManageService 단위 테스트")
class LogManageServiceTest {

    @Mock
    private SysLogRepository sysLogRepository;

    @InjectMocks
    private LogManageService logManageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("시스템 로그 삽입")
    void logInsertSysLog() {
        // given
        SysLogDto dto = SysLogDto.builder()
                .dmndId("REQ_001")
                .prcsSeCd("REQ")
                .build();

        // when
        logManageService.logInsertSysLog(dto);

        // then
        verify(sysLogRepository, times(1)).save(any(SysLog.class));
    }

    @Test
    @DisplayName("시스템 로그 목록 조회")
    void selectSysLogList() {
        // given
        SysLog log = SysLog.builder().dmndId("REQ_001").build();
        Page<SysLog> page = new PageImpl<>(List.of(log));
        when(sysLogRepository.searchSysLogs(anyString(), anyString(), anyString(), any())).thenReturn(page);

        // when
        BaseSearchDto searchDto = new BaseSearchDto();
        List<SysLogDto> result = logManageService.selectSysLogList(searchDto);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDmndId()).isEqualTo("REQ_001");
    }

    @Test
    @DisplayName("시스템 로그 상세 조회")
    void selectSysLogDetail() {
        // given
        SysLog log = SysLog.builder().dmndId("REQ_001").build();
        when(sysLogRepository.findById("REQ_001")).thenReturn(Optional.of(log));

        // when
        SysLogDto result = logManageService.selectSysLogDetail(SysLogDto.builder().dmndId("REQ_001").build());

        // then
        assertThat(result).isNotNull();
        assertThat(result.getDmndId()).isEqualTo("REQ_001");
    }
}
