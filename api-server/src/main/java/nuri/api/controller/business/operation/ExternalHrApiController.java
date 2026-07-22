package nuri.api.controller.business.operation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.operation.ExternalHrService;
import nuri.business.service.operation.dto.ExternalHrDto;
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

    @Operation(summary = "외부인사 목록 조회", description = "외부인사 정보를 페이징하여 조회한다. name 지정 시 성명 부분일치 검색.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ExternalHrDto>>> getAllExternalHr(
            @RequestParam(required = false) String name,
            @PageableDefault(size = 10, sort = "crtDt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<ExternalHrDto> result = externalHrService.getExternalHrList(name, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "외부인사 등록", description = "외부인사 정보를 등록한다.")
    @PostMapping
    public ResponseEntity<ApiResponse<ExternalHrDto>> createExternalHr(@Valid @RequestBody ExternalHrDto dto) {
        return ResponseEntity.ok(ApiResponse.success(externalHrService.createExternalHr(dto)));
    }
}
