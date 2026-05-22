package nuri.foundation.service.stats;

import nuri.foundation.domain.stats.*;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReportStatsService 단위 테스트")
class ReportStatsServiceTest {

    @InjectMocks
    private ReportStatsService reportStatsService;

    @Mock
    private ReprtStatsRepository reprtStatsRepository;

    @Mock
    private DtaUseStatsRepository dtaUseStatsRepository;

    @Mock
    private EgovIdGnrService reprtStatsIdGnrService;

    @Test
    @DisplayName("보고서 통계 목록 조회")
    void getReprtStatsList() {
        given(reprtStatsRepository.findByConditions(anyString(), anyString(), anyString(), any()))
                .willReturn(new PageImpl<>(new ArrayList<>()));

        Page<ReprtStats> result = reportStatsService.getReprtStatsList("TYPE_A", "2024-01-01", "2024-01-31", 0, 10);

        assertThat(result).isNotNull();
        verify(reprtStatsRepository).findByConditions(eq("TYPE_A"), eq("2024-01-01 00:00:00"), eq("2024-01-31 23:59:59"), any(PageRequest.class));
    }

    @Test
    @DisplayName("보고서 통계 총 개수 조회")
    void getReprtStatsCount() {
        given(reprtStatsRepository.countByConditions(anyString(), anyString(), anyString())).willReturn(5L);

        long count = reportStatsService.getReprtStatsCount("TYPE_A", "2024-01-01", "2024-01-31");

        assertThat(count).isEqualTo(5L);
    }

    @Test
    @DisplayName("일자별 보고서 통계 조회")
    void getReprtStatsByDate() {
        given(reprtStatsRepository.countByDate(anyString(), anyString())).willReturn(new ArrayList<>());
        
        List<Object[]> result = reportStatsService.getReprtStatsByDate("2024-01-01", "2024-01-31");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("유형별 보고서 통계 조회")
    void getReprtStatsByType() {
        given(reprtStatsRepository.countByReprtType(anyString(), anyString())).willReturn(new ArrayList<>());
        reportStatsService.getReprtStatsByType("2024-01-01", "2024-01-31");
        verify(reprtStatsRepository).countByReprtType(anyString(), anyString());
    }

    @Test
    @DisplayName("상태별 보고서 통계 조회")
    void getReprtStatsByStatus() {
        given(reprtStatsRepository.countByReprtSttus(anyString(), anyString())).willReturn(new ArrayList<>());
        reportStatsService.getReprtStatsByStatus("2024-01-01", "2024-01-31");
        verify(reprtStatsRepository).countByReprtSttus(anyString(), anyString());
    }

    @Test
    @DisplayName("보고서 통계 등록")
    void insertReprtStats() throws Exception {
        ReflectionTestUtils.setField(reportStatsService, "reprtStatsIdGnrService", reprtStatsIdGnrService);
        given(reprtStatsIdGnrService.getNextStringId()).willReturn("REPRT_001");
        
        ReprtStats stats = ReprtStats.builder().reprtNm("Test").reprtType("A").createdBy("user1").build();
        reportStatsService.insertReprtStats(stats);

        verify(reprtStatsRepository).save(any(ReprtStats.class));
    }
    
    @Test
    @DisplayName("데이터 이용 현황 목록 조회")
    void getDtaUseStatsList() {
        given(dtaUseStatsRepository.findByDateRange(anyString(), anyString(), any()))
                .willReturn(new PageImpl<>(new ArrayList<>()));
        
        Page<DtaUseStats> result = reportStatsService.getDtaUseStatsList("2024-01-01", "2024-01-31", 0, 10);
        
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("데이터 이용 현황 총 개수 조회")
    void getDtaUseStatsCount() {
        given(dtaUseStatsRepository.countByDateRange(anyString(), anyString())).willReturn(10L);
        long count = reportStatsService.getDtaUseStatsCount("2024-01-01", "2024-01-31");
        assertThat(count).isEqualTo(10L);
    }
    
    @Test
    @DisplayName("일자별 데이터 이용 현황 조회")
    void getDtaUseStatsByDate() {
        given(dtaUseStatsRepository.countByDate(anyString(), anyString())).willReturn(new ArrayList<>());
        reportStatsService.getDtaUseStatsByDate("2024-01-01", "2024-01-31");
        verify(dtaUseStatsRepository).countByDate(anyString(), anyString());
    }

    @Test
    @DisplayName("게시판별 데이터 이용 현황 조회")
    void getDtaUseStatsByBbs() {
        given(dtaUseStatsRepository.countByBbsId(anyString(), anyString())).willReturn(new ArrayList<>());
        reportStatsService.getDtaUseStatsByBbs("2024-01-01", "2024-01-31");
        verify(dtaUseStatsRepository).countByBbsId(anyString(), anyString());
    }
}
