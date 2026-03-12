package com.company.project.service.stats;

import com.company.project.domain.stats.DtaUseStats;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

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
    @DisplayName("보고서 통계 목록 조회 성공")
    void getReprtStatsList_Success() {
        // Given
        Page<ReprtStats> page = new PageImpl<>(List.of(mock(ReprtStats.class)));
        given(reprtStatsRepository.findByConditions(anyString(), anyString(), anyString(), any(PageRequest.class))).willReturn(page);

        // When
        Page<ReprtStats> result = reportStatsService.getReprtStatsList("TYPE", "2024-01-01", "2024-01-31", 0, 10);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("보고서 통계 건수 조회")
    void getReprtStatsCount_Success() {
        given(reprtStatsRepository.countByConditions(anyString(), anyString(), anyString())).willReturn(5L);
        long count = reportStatsService.getReprtStatsCount("TYPE", "2024-01-01", "2024-01-31");
        assertThat(count).isEqualTo(5L);
    }

    @Test
    @DisplayName("날짜별 보고서 통계 조회")
    void getReprtStatsByDate_Success() {
        given(reprtStatsRepository.countByDate(anyString(), anyString())).willReturn(Collections.singletonList(new Object[]{"2024-01-01", 1L}));
        List<Object[]> result = reportStatsService.getReprtStatsByDate("2024-01-01", "2024-01-31");
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("유형별 보고서 통계 조회")
    void getReprtStatsByType_Success() {
        given(reprtStatsRepository.countByReprtTy(anyString(), anyString())).willReturn(Collections.singletonList(new Object[]{"TYPE_A", 2L}));
        List<Object[]> result = reportStatsService.getReprtStatsByType("2024-01-01", "2024-01-31");
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("상태별 보고서 통계 조회")
    void getReprtStatsByStatus_Success() {
        given(reprtStatsRepository.countByReprtSttus(anyString(), anyString())).willReturn(Collections.singletonList(new Object[]{"STATUS_A", 3L}));
        List<Object[]> result = reportStatsService.getReprtStatsByStatus("2024-01-01", "2024-01-31");
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("보고서 통계 등록 성공")
    void insertReprtStats_Success() throws Exception {
        // Given
        ReprtStats stats = ReprtStats.builder().reprtNm("New Report").reprtTy("A").build();
        given(reprtStatsIdGnrService.getNextStringId()).willReturn("REPRT_001");

        // When
        reportStatsService.insertReprtStats(stats);

        // Then
        verify(reprtStatsRepository).save(any(ReprtStats.class));
    }

    @Test
    @DisplayName("데이터 이용 현황 목록 조회")
    void getDtaUseStatsList_Success() {
        Page<DtaUseStats> page = new PageImpl<>(List.of(mock(DtaUseStats.class)));
        given(dtaUseStatsRepository.findByDateRange(anyString(), anyString(), any(PageRequest.class))).willReturn(page);

        Page<DtaUseStats> result = reportStatsService.getDtaUseStatsList("2024-01-01", "2024-01-31", 0, 10);
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("데이터 이용 현황 건수 조회")
    void getDtaUseStatsCount_Success() {
        given(dtaUseStatsRepository.countByDateRange(anyString(), anyString())).willReturn(10L);
        long count = reportStatsService.getDtaUseStatsCount("2024-01-01", "2024-01-31");
        assertThat(count).isEqualTo(10L);
    }

    @Test
    @DisplayName("날짜별 데이터 이용 현황 조회")
    void getDtaUseStatsByDate_Success() {
        given(dtaUseStatsRepository.countByDate(anyString(), anyString())).willReturn(Collections.singletonList(new Object[]{"2024-01-01", 5L}));
        List<Object[]> result = reportStatsService.getDtaUseStatsByDate("2024-01-01", "2024-01-31");
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("게시판별 데이터 이용 현황 조회")
    void getDtaUseStatsByBbs_Success() {
        given(dtaUseStatsRepository.countByBbsId(anyString(), anyString())).willReturn(Collections.singletonList(new Object[]{"BBS_001", 8L}));
        List<Object[]> result = reportStatsService.getDtaUseStatsByBbs("2024-01-01", "2024-01-31");
        assertThat(result).hasSize(1);
    }
}
