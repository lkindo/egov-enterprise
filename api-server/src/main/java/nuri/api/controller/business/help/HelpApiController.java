package nuri.api.controller.business.help;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.help.EgovHelpService;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Help", description = "도움말(안내문, 온라인 매뉴얼) API")
@RestController
@RequestMapping("/api/v1/help")
@RequiredArgsConstructor
public class HelpApiController {

    private final EgovHelpService helpService;

    // HPCM (Help)

    @Operation(summary = "도움말 목록 조회", description = "도움말 목록을 페이징하여 조회합니다.")
    @GetMapping("/hpcm")
    public ResponseEntity<ApiResponse<PageResponse<HpcmDto>>> getHpcmList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<HpcmDto> result = helpService.getHpcmList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "도움말 상세 조회", description = "도움말 상세 정보를 조회합니다.")
    @GetMapping("/hpcm/{hpcmId}")
    public ResponseEntity<ApiResponse<HpcmDto>> getHpcm(
            @Parameter(description = "도움말 ID") @PathVariable String hpcmId) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getHpcm(hpcmId)));
    }

    @Operation(summary = "도움말 등록", description = "새로운 도움말을 등록합니다.")
    @PostMapping("/hpcm")
    public ResponseEntity<ApiResponse<String>> insertHpcm(@Valid @RequestBody HpcmDto dto) {
        String id = helpService.createHpcm("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "도움말 수정", description = "도움말 정보를 수정합니다.")
    @PutMapping("/hpcm/{hpcmId}")
    public ResponseEntity<ApiResponse<Void>> updateHpcm(
            @PathVariable String hpcmId,
            @Valid @RequestBody HpcmDto dto) {
        helpService.updateHpcm(hpcmId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "도움말 삭제", description = "도움말 정보를 삭제합니다.")
    @DeleteMapping("/hpcm/{hpcmId}")
    public ResponseEntity<ApiResponse<Void>> deleteHpcm(@PathVariable String hpcmId) {
        helpService.deleteHpcm(hpcmId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Online Manual

    @Operation(summary = "온라인 매뉴얼 목록 조회", description = "온라인 매뉴얼 목록을 페이징하여 조회합니다.")
    @GetMapping("/manuals")
    public ResponseEntity<ApiResponse<PageResponse<OnlineManualDto>>> getManuals(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<OnlineManualDto> result = helpService.getOnlineManualList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "온라인 매뉴얼 상세 조회", description = "특정 온라인 매뉴얼의 상세 정보를 조회합니다.")
    @GetMapping("/manuals/{mnlId}")
    public ResponseEntity<ApiResponse<OnlineManualDto>> getManual(
            @Parameter(description = "매뉴얼 ID") @PathVariable String mnlId) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getOnlineManual(mnlId)));
    }

    @Operation(summary = "온라인 매뉴얼 등록", description = "새로운 온라인 매뉴얼을 등록합니다.")
    @PostMapping("/manuals")
    public ResponseEntity<ApiResponse<String>> createManual(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody OnlineManualDto dto) {
        String username = (userDetails != null) ? userDetails.getUsername() : "anonymous";
        String id = helpService.createOnlineManual(username, dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "온라인 매뉴얼 수정", description = "온라인 매뉴얼 정보를 수정합니다.")
    @PutMapping("/manuals/{mnlId}")
    public ResponseEntity<ApiResponse<Void>> updateManual(
            @PathVariable String mnlId,
            @Valid @RequestBody OnlineManualDto dto) {
        helpService.updateOnlineManual(mnlId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "온라인 매뉴얼 삭제", description = "온라인 매뉴얼 정보를 삭제합니다.")
    @DeleteMapping("/manuals/{mnlId}")
    public ResponseEntity<ApiResponse<Void>> deleteManual(@PathVariable String mnlId) {
        helpService.deleteOnlineManual(mnlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
