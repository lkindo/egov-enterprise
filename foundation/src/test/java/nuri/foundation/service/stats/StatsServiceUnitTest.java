package nuri.foundation.service.stats;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.service.stats.dto.StatsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@DisplayName("StatsService (통계 서비스) 유닛 테스트")
class StatsServiceUnitTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query query;

    @InjectMocks
    private StatsService statsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("getSummary - 성공")
    void getSummary_Success() {
        // given
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.getSingleResult()).thenReturn(10L, 5L, 20L, 50L);

        // when
        Map<String, Object> result = statsService.getSummary();

        // then
        assertThat(result.get("userCount")).isEqualTo(10L);
        assertThat(result.get("bbsCount")).isEqualTo(5L);
        assertThat(result.get("menuCount")).isEqualTo(20L);
        assertThat(result.get("todayVisit")).isEqualTo(50L);
    }

    @Test
    @DisplayName("getSummary - 예외 발생 시 빈 맵 반환")
    void getSummary_Exception() {
        // given
        when(entityManager.createNativeQuery(anyString())).thenThrow(new RuntimeException("DB Error"));

        // when
        Map<String, Object> result = statsService.getSummary();

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getMenuStats - 성공")
    void getMenuStats_Success() {
        // given
        Object[] row = new Object[]{"Menu A", 100L};
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.getResultList()).thenReturn(Collections.singletonList(row));

        // when
        List<Map<String, Object>> result = statsService.getMenuStats();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).get("menuNm")).isEqualTo("Menu A");
        assertThat(result.get(0).get("visitCount")).isEqualTo(100L);
    }

    @Test
    @DisplayName("getMenuStats - 예외 발생 시 빈 리스트 반환")
    void getMenuStats_Exception() {
        // given
        when(entityManager.createNativeQuery(anyString())).thenThrow(new RuntimeException("DB Error"));

        // when
        List<Map<String, Object>> result = statsService.getMenuStats();

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("executeStatsQuery - 예외 발생 시 BusinessException 던짐")
    void executeStatsQuery_Exception() {
        // given
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.getResultList()).thenThrow(new RuntimeException("Query Error"));

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () -> 
            statsService.getConnectionStats("20240101", "20240131", "STK01")
        );
        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR);
    }

    @Test
    @DisplayName("executeStatsQuery - 결과 매핑 시 NullPointerException 방지")
    void executeStatsQuery_ResultMapping() {
        // given
        Object[] row = new Object[]{"20240101", 10};
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.getResultList()).thenReturn(Collections.singletonList(row));

        // when
        List<StatsDto> result = statsService.getConnectionStats("20240101", "20240131", "STK01");

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsDate()).isEqualTo("20240101");
        assertThat(result.get(0).getStatsCo()).isEqualTo(10);
    }
}
