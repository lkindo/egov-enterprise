package com.company.project.service.stats;

import com.company.project.domain.stats.DtaUseStatsRepository;
import com.company.project.domain.stats.ReprtStatsRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportStatsService 단위 테스트")
class ReportStatsServiceTest {

    @Mock
    private ReprtStatsRepository reprtStatsRepository;

    @Mock
    private DtaUseStatsRepository dtaUseStatsRepository;

    @InjectMocks
    private ReportStatsService reportStatsService;

    @Test
    @DisplayName("날짜별 보고서 통계 조회 테스트")
    void getReprtStatsByDateTest() {
        // Given
        Object[] row = new Object[]{"20260318", 5L};
        when(reprtStatsRepository.countByDate(anyString(), anyString())).thenReturn(Collections.singletonList(row));

        // When
        List<Object[]> result = reportStatsService.getReprtStatsByDate("20260301", "20260318");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0)[0]).isEqualTo("20260318");
        assertThat(result.get(0)[1]).isEqualTo(5L);
    }

    @Test
    @DisplayName("날짜별 자료이용 통계 조회 테스트")
    void getDtaUseStatsByDateTest() {
        // Given
        Object[] row = new Object[]{"20260318", 10L};
        when(dtaUseStatsRepository.countByDate(anyString(), anyString())).thenReturn(Collections.singletonList(row));

        // When
        List<Object[]> result = reportStatsService.getDtaUseStatsByDate("20260301", "20260318");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0)[0]).isEqualTo("20260318");
        assertThat(result.get(0)[1]).isEqualTo(10L);
    }
}
