package com.company.project.service.stats;

import com.company.project.service.stats.dto.StatsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
@DisplayName("StatsService 테스트")
class StatsServiceTest {

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private StatsService statsService;

    @Test
    @DisplayName("접속 통계 조회 성공")
    void getConnectionStats_Success() {
        // Given
        Query query = mock(Query.class);
        Object[] row = new Object[]{"2024-01-01", 100};
        given(entityManager.createNativeQuery(anyString())).willReturn(query);
        given(query.getResultList()).willReturn(List.of(row));

        // When
        List<StatsDto> result = statsService.getConnectionStats("2024-01-01", "2024-01-31", "KIND");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsDate()).isEqualTo("2024-01-01");
        assertThat(result.get(0).getStatsCo()).isEqualTo(100);
    }

    @Test
    @DisplayName("게시판 통계 조회 성공")
    void getBoardStats_Success() {
        // Given
        Query query = mock(Query.class);
        Object[] row = new Object[]{"2024-01-01", 50};
        given(entityManager.createNativeQuery(anyString())).willReturn(query);
        given(query.getResultList()).willReturn(List.of(row));

        // When
        List<StatsDto> result = statsService.getBoardStats("2024-01-01", "2024-01-31", "KIND");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsCo()).isEqualTo(50);
    }

    @Test
    @DisplayName("사용자 통계 조회 성공")
    void getUserStats_Success() {
        // Given
        Query query = mock(Query.class);
        Object[] row = new Object[]{"2024-01-01", 10};
        given(entityManager.createNativeQuery(anyString())).willReturn(query);
        given(query.getResultList()).willReturn(List.of(row));

        // When
        List<StatsDto> result = statsService.getUserStats("2024-01-01", "2024-01-31", "KIND");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsCo()).isEqualTo(10);
    }

    @Test
    @DisplayName("요청 통계 조회 성공")
    void getRequestStats_Success() {
        // Given
        Query query = mock(Query.class);
        Object[] row = new Object[]{"2024-01-01", 200};
        given(entityManager.createNativeQuery(anyString())).willReturn(query);
        given(query.getResultList()).willReturn(List.of(row));

        // When
        List<StatsDto> result = statsService.getRequestStats("2024-01-01", "2024-01-31", "KIND");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsCo()).isEqualTo(200);
    }

    @Test
    @DisplayName("통계 조회 실패 - 예외 발생 시 빈 리스트 반환")
    void executeStatsQuery_Exception_ReturnsEmptyList() {
        // Given
        given(entityManager.createNativeQuery(anyString())).willThrow(new RuntimeException("DB Error"));

        // When
        List<StatsDto> result = statsService.getConnectionStats("2a", "2b", "k");

        // Then
        assertThat(result).isEmpty();
    }
}
