package nuri.api.controller.foundation.controller.system.policy;

import jakarta.validation.Valid;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import nuri.business.service.system.policy.PolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 시스템 정책 및 약관 관리를 위한 API 컨트롤러
 */
@Tag(name = "Policy Management", description = "시스템 정책/약관 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/system/policies")
@RequiredArgsConstructor
public class PolicyApiController {

    private final PolicyService policyService;

    @Operation(summary = "정책 목록 조회", description = "시스템의 모든 정책 목록을 조회합니다.")
    @GetMapping("")
    public ResponseEntity<ApiResponse<List<PolicyService.Policy>>> getPolicies() {
        return ResponseEntity.ok(ApiResponse.success(policyService.getPolicies()));
    }

    /**
     * 정책 본문 조회.
     *
     * <p>[2026-08-28] <b>미등록 유형의 기본값 생성을 제거한다.</b>
     *
     * <p>종전에는 등록된 정책이 없으면 서버가 본문을 <b>지어내서</b> 200 으로 돌려줬다 —
     * 특히 {@code privacy} 는 "본 시스템은 사용자의 개인정보를 소중히 다루며, 관련 법규를
     * 준수합니다." 라는 <b>개인정보 처리 방침</b>을 만들어 냈다. 신규 설치의 기본 상태가
     * "가짜 개인정보처리방침을 진짜처럼 게시" 였다는 뜻이다.
     *
     * <p>더 나쁜 것은 관리자도 구분할 수 없었다는 점이다 — 편집 화면이 이 응답을 그대로 읽으므로
     * 화면에 보이는 본문이 저장된 것인지 서버가 만든 것인지 알 방법이 없었다.
     *
     * <p>법적 효력을 갖는 문서는 없으면 없다고 해야 한다. 미등록은 404 다.
     */
    @Operation(summary = "정책 내용 조회", description = "저작권(copyright) 또는 개인정보보호정책(privacy) 내용을 조회합니다. 등록된 정책이 없으면 404 입니다.")
    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<PolicyService.Policy>> getPolicy(@PathVariable String type) {
        // 목록 조회(getPolicies)와 동일한 필드명(plcyTypeCd/plcyTtl/plcyCn)으로 응답한다.
        PolicyService.Policy result = policyService.getPolicy(type)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                        "등록된 정책이 없습니다: " + type));

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @Operation(summary = "정책 내용 수정")
    @PutMapping("/{type}")
    public ResponseEntity<ApiResponse<Void>> updatePolicy(
            @PathVariable String type,
            @Valid @RequestBody PolicyUpdateRequest request) {

        log.info("Updating policy: type={}, title={}, content length={}",
                type, request.plcyTtl(), request.plcyCn().length());

        policyService.updatePolicy(type, request.plcyTtl(), request.plcyCn());

        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
