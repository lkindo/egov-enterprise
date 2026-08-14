package nuri.business.service.log;

import nuri.business.domain.log.SysLog;
import nuri.business.domain.log.SysLogRepository;
import nuri.business.service.log.dto.SysLogDto;
import nuri.business.domain.common.BaseSearchDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

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
                .sysLogSn(999L)
                .dmndId("REQ_001")
                .prcsSeCd("REQ")
                .build();

        // when
        logManageService.logInsertSysLog(dto);

        // then
        ArgumentCaptor<SysLog> captor = ArgumentCaptor.forClass(SysLog.class);
        verify(sysLogRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getSysLogSn()).isNull();
        assertThat(captor.getValue().getDmndId()).isEqualTo("REQ_001");
    }

    @Test
    @DisplayName("시스템 로그 목록 조회")
    void selectSysLogList() {
        // given
        SysLog log = SysLog.builder().sysLogSn(1L).dmndId("REQ_001").build();
        Page<SysLog> page = new PageImpl<>(List.of(log));
        when(sysLogRepository.searchSysLogs(any(), any(), any(), any())).thenReturn(page);

        // when
        BaseSearchDto searchDto = new BaseSearchDto();
        List<SysLogDto> result = logManageService.selectSysLogList(searchDto);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSysLogSn()).isEqualTo(1L);
        assertThat(result.get(0).getDmndId()).isEqualTo("REQ_001");
    }

    @Test
    @DisplayName("시스템 로그 상세 조회")
    void selectSysLogDetail() {
        // given
        SysLog log = SysLog.builder().sysLogSn(1L).dmndId("REQ_001").build();
        when(sysLogRepository.findById(1L)).thenReturn(Optional.of(log));

        // when
        SysLogDto result = logManageService.selectSysLogDetail(1L);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getSysLogSn()).isEqualTo(1L);
        assertThat(result.getDmndId()).isEqualTo("REQ_001");
    }
}
