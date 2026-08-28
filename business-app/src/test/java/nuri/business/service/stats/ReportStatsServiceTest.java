package nuri.business.service.stats;

import nuri.business.domain.stats.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

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
    private nuri.business.domain.board.BoardRepository boardRepository;

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
        ReprtStats stats = ReprtStats.builder().reprtNm("Test").reprtType("A").build();
        reportStatsService.insertReprtStats(stats);

        ArgumentCaptor<ReprtStats> captor = ArgumentCaptor.forClass(ReprtStats.class);
        verify(reprtStatsRepository).save(captor.capture());
        assertThat(captor.getValue().getRptpSn()).isNull();
        assertThat(captor.getValue().getReprtNm()).isEqualTo("Test");
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

    /**
     * 게시물 통계가 게시글을 실제로 센다.
     *
     * <p>[2026-08-28] 종전 {@code getBbsStatsByDate} 는 {@code dtaUseStatsRepository.countByDate}
     * 를 불렀다 — 바로 위 {@code getDtaUseStatsByDate} 와 <b>완전히 같은 질의</b>다. 즉 게시물
     * 통계 화면은 게시글을 하나도 세지 않고 자료이용현황과 같은 숫자를 받고 있었고,
     * {@code tb_dta_use_stats} 에는 쓰는 코드가 없어(writer 0건) 실제로는 늘 비어 있었다.
     *
     * <p>두 축을 함께 고정한다 — 게시판 저장소를 부르는가, 그리고 <b>통계 표를 더 이상 부르지
     * 않는가</b>. 앞의 것만 검사하면 둘 다 부르는 어중간한 상태가 통과한다.
     */
    @Test
    @DisplayName("일자별 게시물 통계는 게시글을 센다 — 자료이용현황 표를 읽지 않는다")
    void getBbsStatsByDateCountsPosts() {
        given(boardRepository.countPostsByDate(anyString(), anyString())).willReturn(new ArrayList<>());

        reportStatsService.getBbsStatsByDate("2024-01-01", "2024-01-31");

        verify(boardRepository).countPostsByDate("2024-01-01 00:00:00", "2024-01-31 23:59:59");
        verify(dtaUseStatsRepository, never()).countByDate(anyString(), anyString());
    }

    @Test
    @DisplayName("게시판별 데이터 이용 현황 조회")
    void getDtaUseStatsByBbs() {
        given(dtaUseStatsRepository.countByBbsId(anyString(), anyString())).willReturn(new ArrayList<>());
        reportStatsService.getDtaUseStatsByBbs("2024-01-01", "2024-01-31");
        verify(dtaUseStatsRepository).countByBbsId(anyString(), anyString());
    }
}
