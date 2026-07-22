package nuri.api.controller.foundation.controller.system.policy;

import jakarta.validation.Valid;
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

    @Operation(summary = "정책 내용 조회", description = "저작권(copyright) 또는 개인정보보호정책(privacy) 내용을 조회합니다.")
    @GetMapping("/{type}")
    public ResponseEntity<ApiResponse<PolicyService.Policy>> getPolicy(@PathVariable String type) {
        // 목록 조회(getPolicies)와 동일한 필드명(plcyTypeCd/plcyTtl/plcyCn)으로 응답한다.
        PolicyService.Policy result = policyService.getPolicy(type)
                .orElseGet(() -> defaultPolicy(type));

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 미등록 정책 유형에 대한 기본값
     */
    private PolicyService.Policy defaultPolicy(String type) {
        if ("copyright".equalsIgnoreCase(type)) {
            return PolicyService.Policy.builder()
                    .plcyTypeCd(type)
                    .plcyTtl("저작권 보호 정책")
                    .plcyCn("본 시스템의 모든 콘텐츠는 저작권법의 보호를 받습니다.")
                    .build();
        }
        if ("privacy".equalsIgnoreCase(type)) {
            return PolicyService.Policy.builder()
                    .plcyTypeCd(type)
                    .plcyTtl("개인정보 처리 방침")
                    .plcyCn("본 시스템은 사용자의 개인정보를 소중히 다루며, 관련 법규를 준수합니다.")
                    .build();
        }
        return PolicyService.Policy.builder()
                .plcyTypeCd(type)
                .plcyTtl("기타 정책")
                .plcyCn("준비 중인 정책 페이지입니다.")
                .build();
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
