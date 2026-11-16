package nuri.api.controller.business.operation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.event.ExternalHrService;
import nuri.business.service.event.dto.ExternalHrDto;
import nuri.business.service.event.dto.ExternalHrListItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "ExternalHr", description = "외부인사정보 API")
@RestController
@RequestMapping("/api/v1/admin/operation/external-hr")
@RequiredArgsConstructor
public class ExternalHrApiController {

    private final ExternalHrService externalHrService;

    @Operation(summary = "외부인사 목록 조회", description = "외부인사 정보를 페이징하여 조회한다. 민감 필드(생년월일·전화번호 가운데 자리·이메일)는 마스킹해 반환하며, evntSn·name 조건 필터를 지원한다.")
    @PrivacyAccess("외부인사 목록(생년월일·전화번호·이메일 마스킹)")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.ExternalHrApiController#getAllExternalHr')")
    public ResponseEntity<ApiResponse<PageResponse<ExternalHrListItemDto>>> getAllExternalHr(
            @RequestParam(required = false) Long evntSn,
            @RequestParam(required = false) String name,
            @PageableDefault(size = 10, sort = "crtDt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ExternalHrListItemDto> result = externalHrService.getExternalHrList(evntSn, name, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "외부인사 상세 조회", description = "외부인사 단건 상세 정보(원문)를 조회하고 감사 원장에 대상 좌표를 기록한다.")
    @PrivacyAccess("외부인사 상세(생년월일·전화번호·이메일 원문)")
    @GetMapping("/{evntSn}/{otsdHrId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.ExternalHrApiController#getExternalHr')")
    public ResponseEntity<ApiResponse<ExternalHrDto>> getExternalHr(
            @PathVariable Long evntSn,
            @PathVariable String otsdHrId) {
        return ResponseEntity.ok(ApiResponse.success(externalHrService.getExternalHr(evntSn, otsdHrId)));
    }

    @Operation(summary = "외부인사 등록", description = "외부인사 정보를 등록한다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201",
                    description = "등록 성공", useReturnTypeSchema = true),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409",
                    description = "동일 복합키 중복 또는 유효하지 않은 행사 참조로 데이터 제약과 충돌 (code: C008)",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(ref = "#/components/schemas/ApiResponseVoid")))
    })
    @PostMapping
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.ExternalHrApiController#createExternalHr')")
    public ResponseEntity<ApiResponse<ExternalHrDto>> createExternalHr(@Valid @RequestBody ExternalHrDto dto) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.created(externalHrService.createExternalHr(dto)));
    }

    /*
     * [2026-09-05 DEC-OPS-036] 수정·삭제 신설. 종전에는 GET·POST 뿐이라 이름 오타 하나도 정정할 수 없었다(감사 D11-01).
     * 식별자는 복합키(evnt_sn, otsd_hr_id)라 경로에 둘 다 싣는다.
     */
    @Operation(summary = "외부인사 수정", description = "외부인사 정보를 수정한다. 식별자(evntSn·otsdHrId)는 바꾸지 않는다.")
    @PutMapping("/{evntSn}/{otsdHrId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.ExternalHrApiController#updateExternalHr')")
    public ResponseEntity<ApiResponse<ExternalHrDto>> updateExternalHr(
            @PathVariable Long evntSn,
            @PathVariable String otsdHrId,
            @Valid @RequestBody ExternalHrDto dto) {
        return ResponseEntity.ok(ApiResponse.success(externalHrService.updateExternalHr(evntSn, otsdHrId, dto)));
    }

    @Operation(summary = "외부인사 삭제", description = "외부인사 정보를 삭제한다.")
    @DeleteMapping("/{evntSn}/{otsdHrId}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.operation.ExternalHrApiController#deleteExternalHr')")
    public ResponseEntity<ApiResponse<Void>> deleteExternalHr(
            @PathVariable Long evntSn,
            @PathVariable String otsdHrId) {
        externalHrService.deleteExternalHr(evntSn, otsdHrId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
