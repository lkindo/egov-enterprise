package com.company.project.service.stats;

import com.company.project.core.exception.BusinessException;
import com.company.project.service.stats.dto.StatsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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
        
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(java.util.Collections.singletonList(row));

        // When
        List<StatsDto> result = statsService.getConnectionStats("2024-01-01", "2024-01-31", "KIND");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatsDate()).isEqualTo("2024-01-01");
        assertThat(result.get(0).getStatsCo()).isEqualTo(100);
    }

    @Test
    @DisplayName("통계 조회 실패 - 예외 발생 시 BusinessException 던짐")
    void executeStatsQuery_Exception_ThrowsBusinessException() {
        // Given
        when(entityManager.createNativeQuery(anyString())).thenThrow(new RuntimeException("DB Error"));

        // When & Then
        assertThatThrownBy(() -> statsService.getConnectionStats("2a", "2b", "k"))
                .isInstanceOf(BusinessException.class);
    }
}
