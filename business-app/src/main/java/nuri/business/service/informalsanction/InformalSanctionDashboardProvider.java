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
            // [2026-09-02] 상태 조건이 없는 수신 전체 질의를 쓰고 있었다 — 이미 처리한 건까지
            //   'pendingApprovalCount' 로 세어, 대시보드의 대기 건수가 결재자가 아무것도 하지
            //   않아도 줄지 않았다. 이름이 약속하는 상태(신청)로 거른다.
            long pendingApprovalCount = approvalService.getPendingApprovalList(userId, Pageable.unpaged()).getTotalElements();
            result.put("pendingApprovalCount", pendingApprovalCount);
        } catch (Exception e) {
            result.put("pendingApprovalCount", 0L);
        }
    }
}
