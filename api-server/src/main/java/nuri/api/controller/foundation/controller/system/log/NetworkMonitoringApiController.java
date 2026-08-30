package nuri.api.controller.foundation.controller.system.log;

import jakarta.validation.Valid;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.domain.common.BaseSearchDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "NetworkMonitoring", description = "네트워크 서비스 모니터링 API (Admin)")
@RestController("networkMonitoringApiController")
@RequestMapping("/api/v1/admin/system/ntwrksvc-monitoring")
public class NetworkMonitoringApiController {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NetworkDto {
        private String ntwrkId;
        private String manageIem;
        private String ntwrkIp;
        private String gtwy;
        private String subnet;
        private String domnServer;
        private String userNm;
        private String useYn;
    }

    @Data
    @Builder
    public static class NetworkStatusDetailedDto {
        private String sysNm;
        private String sysIp;
        private String sysPort;
        private String svcSttus;
        private String logDt;
    }

    /**
     * 미구현 사유. 이 도메인은 엔티티·리포지토리·물리 테이블이 모두 없다
     * (db/migration 전량에 ntwrk/network 매치 0건, @Entity 0건).
     */
    private static final String NOT_IMPL_MSG =
            "네트워크 노드 관리는 아직 구현되지 않았습니다. (저장소·계측 소스 미연결)";

    @Operation(summary = "네트워크 서비스 상태 목록 조회",
            description = "계측 소스가 연결되기 전까지 항상 빈 목록을 반환한다. 하드코딩된 가짜 헬스 상태를 내리지 않는다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NetworkStatusDetailedDto>>> getStatus(
            @Valid @ModelAttribute BaseSearchDto searchDto) {

        // [W0-06] 종전에는 노드 6건을 소스에 박아 두고 logDt 만 now() 로 갈아 '실시간 계측'처럼 반환했다.
        //   관리자가 존재하지 않는 인프라의 헬스 상태를 보고 운영 판단을 하게 되므로 제거한다.
        //   빈 목록은 '데이터 없음'이라는 참인 진술이며, 화면은 이를 빈 상태로 렌더한다.
        List<NetworkStatusDetailedDto> list = List.of();

        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(list, searchDto.getPageIndex(), searchDto.getPageUnit(), 0)));
    }

    @Operation(summary = "네트워크 기초 정보 등록", description = "미구현 — 501 을 반환한다(저장 없이 200 을 주지 않는다).")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createNetwork(@RequestBody NetworkDto networkDto) {
        return notImplemented();
    }

    @Operation(summary = "네트워크 정보 수정", description = "미구현 — 501 을 반환한다.")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateNetwork(@PathVariable String id, @RequestBody NetworkDto networkDto) {
        return notImplemented();
    }

    @Operation(summary = "네트워크 정보 삭제", description = "미구현 — 501 을 반환한다.")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNetwork(@PathVariable String id) {
        return notImplemented();
    }

    /**
     * 저장 경로가 없는 쓰기 요청에 대한 정직한 응답.
     * 종전에는 아무것도 저장하지 않고 200 + success=true 를 돌려주어, 등록/수정/삭제가 반영된 것처럼 보였다.
     */
    private ResponseEntity<ApiResponse<Void>> notImplemented() {
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED)
                .body(ApiResponse.error(CommonErrorCode.NOT_IMPLEMENTED, NOT_IMPL_MSG));
    }
}
