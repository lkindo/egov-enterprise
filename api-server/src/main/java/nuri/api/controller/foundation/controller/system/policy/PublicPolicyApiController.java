package nuri.api.controller.foundation.controller.system.policy;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import nuri.business.service.system.policy.PolicyService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 로그인한 일반 사용자가 등록된 시스템 정책(개인정보처리방침·저작권 등)을 열람하는 API.
 * 관리자용 버전·수정자 메타데이터는 노출하지 않으며 미등록 유형은 404를 반환한다.
 */
@Tag(name = "Policy Public", description = "로그인 사용자용 시스템 정책/약관 열람 API")
@RestController
@RequestMapping("/api/v1/policies")
@RequiredArgsConstructor
public class PublicPolicyApiController {

    private final PolicyService policyService;

    @Operation(summary = "시스템 정책 일반 열람", description = "로그인한 사용자가 등록된 시스템 정책을 조회합니다. 미등록 정책은 404입니다.")
    @GetMapping("/{type}")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.controller.system.policy.PublicPolicyApiController#getPublicPolicy')")
    public ResponseEntity<ApiResponse<PolicyService.PublicPolicy>> getPublicPolicy(@PathVariable String type) {
        PolicyService.PublicPolicy result = policyService.getPublicPolicy(type)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND,
                        "등록된 정책이 없습니다: " + type));
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
