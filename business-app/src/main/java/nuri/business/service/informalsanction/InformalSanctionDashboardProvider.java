package nuri.business.service.informalsanction;

import lombok.RequiredArgsConstructor;
import nuri.foundation.core.dashboard.DashboardItemProvider;
import org.springframework.stereotype.Component;
import java.util.Map;

/**
 * InformalSanction 대시보드 위젯 데이터 프로바이더 어댑터
 */
@Component
@RequiredArgsConstructor
public class InformalSanctionDashboardProvider implements DashboardItemProvider {

    private final InformalSanctionService approvalService;

    @Override
    public void provideDashboardData(String userId, Map<String, Object> result) {
        try {
            // Dashboard의 CustomUserDetails.getUsername()은 결재선과 같은 esntlId를 반환한다.
            long pendingApprovalCount = approvalService.getPendingApprovalCount(userId);
            result.put("pendingApprovalCount", pendingApprovalCount);
        } catch (Exception e) {
            // [2026-09-15 DEC-OPS-100] 조회 실패를 0건으로 채우지 않는다. 값을 싣지 않으면 응답이 null(셀 수 없음)을 내린다.
            result.remove("pendingApprovalCount");
        }
    }
}
