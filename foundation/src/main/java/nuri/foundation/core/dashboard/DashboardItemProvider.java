package nuri.foundation.core.dashboard;

import java.util.Map;

/**
 * 대시보드 통합 데이터 구성을 위한 확장 지점 포트 인터페이스 (DIP)
 */
public interface DashboardItemProvider {
    void provideDashboardData(String userId, Map<String, Object> result);
}
