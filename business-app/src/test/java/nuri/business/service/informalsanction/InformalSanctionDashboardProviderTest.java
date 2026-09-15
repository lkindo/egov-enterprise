package nuri.business.service.informalsanction;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * [2026-09-15 DEC-OPS-100] 결재 대기 위젯은 셀 수 없는 건수를 0 으로 채우지 않는다.
 *
 * <p>종전에는 조회가 실패하면 {@code 0L} 을 넣어, 화면이 결재자가 할 일이 없다고 말했다. 값을 싣지 않으면
 * {@code DashboardResponse} 가 {@code null}(셀 수 없음)을 내린다.</p>
 */
class InformalSanctionDashboardProviderTest {

    private final InformalSanctionService approvalService = mock(InformalSanctionService.class);
    private final InformalSanctionDashboardProvider provider = new InformalSanctionDashboardProvider(approvalService);

    @Test
    @DisplayName("대기 중인 결재 건수를 센다")
    void countsPendingApprovals() {
        when(approvalService.getPendingApprovalList(eq("user-1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList(), Pageable.unpaged(), 3));
        Map<String, Object> result = new HashMap<>();

        provider.provideDashboardData("user-1", result);

        assertThat(result).containsEntry("pendingApprovalCount", 3L);
    }

    @Test
    @DisplayName("조회에 실패하면 0 을 채우지 않는다")
    void doesNotReportZeroWhenTheQueryFails() {
        when(approvalService.getPendingApprovalList(any(), any())).thenThrow(new RuntimeException("approval store down"));
        Map<String, Object> result = new HashMap<>();

        provider.provideDashboardData("user-1", result);

        assertThat(result).doesNotContainKey("pendingApprovalCount");
    }
}
