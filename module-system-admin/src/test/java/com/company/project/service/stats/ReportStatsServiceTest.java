package com.company.project.service.stats;

import com.company.project.domain.stats.DtaUseStatsRepository;
import com.company.project.domain.stats.ReprtStats;
import com.company.project.domain.stats.ReprtStatsRepository;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportStatsService 테스트")
class ReportStatsServiceTest {

    @Mock
    private ReprtStatsRepository reprtStatsRepository;

    @Mock
    private DtaUseStatsRepository dtaUseStatsRepository;

    @Mock(name = "reprtStatsIdGnrService")
    private EgovIdGnrService reprtStatsIdGnrService;

    @InjectMocks
    private ReportStatsService reportStatsService;

    @Test
    @DisplayName("보고서 통계 목록 조회")
    void getReprtStatsList_Success() {
        Page<ReprtStats> page = new PageImpl<>(Collections.emptyList());
        when(reprtStatsRepository.findByConditions(anyString(), anyString(), anyString(), any(PageRequest.class)))
                .thenReturn(page);
        Page<ReprtStats> result = reportStatsService.getReprtStatsList("TYPE", "2024-01-01", "2024-01-31", 0, 10);
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("데이터 이용 통계 카운트 조회")
    void getDtaUseStatsCount_Success() {
        when(dtaUseStatsRepository.countByDateRange(anyString(), anyString())).thenReturn(5L);
        long count = reportStatsService.getDtaUseStatsCount("2024-01-01", "2024-01-31");
        assertThat(count).isEqualTo(5L);
    }
}
