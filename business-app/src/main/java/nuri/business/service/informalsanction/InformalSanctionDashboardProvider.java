package nuri.business.service.informalsanction;

import lombok.RequiredArgsConstructor;
import nuri.foundation.core.dashboard.DashboardItemProvider;
import org.springframework.data.domain.Pageable;
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
            long pendingApprovalCount = approvalService.getReceivedInformalSanctionList(userId, Pageable.unpaged()).getTotalElements();
            result.put("pendingApprovalCount", pendingApprovalCount);
        } catch (Exception e) {
            result.put("pendingApprovalCount", 0L);
        }
    }
}
