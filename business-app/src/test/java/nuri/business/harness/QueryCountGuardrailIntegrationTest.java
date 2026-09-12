package nuri.business.harness;

import nuri.business.service.department.DeptManageService;
import nuri.business.service.department.dto.DeptManageDto;
import nuri.business.support.BusinessIntegrationTestSupport;
import nuri.business.core.harness.QueryCountGuard;
import nuri.business.core.harness.QueryCountInspector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JPA 성능 가드레일(QueryCountGuard) **계측 인프라** 연동 및 오동작 방지 검증.
 *
 * ── 이 파일이 보는 것 ────────────────────────────────────────────────────────
 * 특정 도메인의 N+1 상한이 아니라 **계측 자체가 동작하는가**다 — 카운터가 실제 쿼리를 세는가,
 * 그리고 **비동기 스레드 풀에서 실행된 쿼리까지 따라가는가**(릭 전파). 도메인은 그 계측을 굴리는
 * 수단일 뿐이다.
 *
 * ⚠ 그래서 표적이 **core 도메인**이어야 한다. 종전에는 `AddressBookService`(demo pack 소유)를
 *   불렀고, 그 타입 참조 한 줄 때문에 재사용 base 투영에서 **이 파일 전체가 연쇄 제거**됐다 —
 *   축소 프로필(core·collaboration)에는 계측 가드레일이 아예 없었다(GAP-PACK-001 ④).
 *   부서 관리는 business-core 소유라 모든 프로필에 남는다.
 *
 * ⚠ 주소록 고유의 N+1 상한은 버리지 않고 {@code AddressBookQueryCountIntegrationTest} 로 옮겼다.
 *   그쪽은 주소록이 빠지는 프로필에서 **함께 사라지는 것이 맞다** — 도메인이 없으면 그 상한도 없다.
 */
class QueryCountGuardrailIntegrationTest extends BusinessIntegrationTestSupport {

    @Autowired
    private DeptManageService deptManageService;

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("logExecutor")
    private java.util.concurrent.Executor logExecutor;

    @Test
    @DisplayName("JPA 성능 가드레일 - 계측이 정상 범위의 쿼리를 실제로 센다")
    @QueryCountGuard(max = 15)
    void queryCountGuardrail_successWithinLimit() {
        // given
        DeptManageDto saveRequest = DeptManageDto.builder()
                .ognzNm("Harness Test Dept")
                .ognzExpln("query count guardrail fixture")
                .build();

        // when
        deptManageService.insertDeptManage(saveRequest);
        deptManageService.getDeptManageList("Harness", PageRequest.of(0, 10));

        // then
        int currentCount = QueryCountInspector.getCount();
        // 0 이면 계측이 죽은 것이고, 상한을 넘으면 @QueryCountGuard 가 먼저 실패한다.
        assertThat(currentCount).isGreaterThan(0);
        assertThat(currentCount).isLessThanOrEqualTo(15);
    }

    @Test
    @DisplayName("JPA 성능 가드레일 - 비동기 스레드 풀 상의 쿼리 릭 전파 계측 검증")
    @QueryCountGuard(max = 20)
    void queryCountGuardrail_asyncThreadQueryLeakTracking() throws Exception {
        // when — 다른 스레드에서 실행된 쿼리도 카운터에 잡혀야 한다.
        java.util.concurrent.CompletableFuture<Void> future = java.util.concurrent.CompletableFuture.runAsync(() -> {
            deptManageService.getDeptManageList("Harness", PageRequest.of(0, 10));
        }, logExecutor);

        future.get();

        // then
        assertThat(QueryCountInspector.getCount()).isGreaterThan(0);
    }
}
