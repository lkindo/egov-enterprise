package nuri.api.controller.business.help;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.help.HelpService;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
import nuri.business.service.help.dto.PublicHpcmDto;
import nuri.business.service.help.dto.PublicOnlineManualDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Help", description = "도움말(안내문, 온라인 매뉴얼) API")
@RestController
@RequestMapping("/api/v1/help")
@RequiredArgsConstructor
public class HelpApiController {

    private final HelpService helpService;

    // HPCM (Help)

    @Operation(summary = "도움말 목록 조회", description = "도움말 목록을 페이징하여 조회합니다.")
    @GetMapping("/hpcm")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#getHpcmList')")
    public ResponseEntity<ApiResponse<PageResponse<HpcmDto>>> getHpcmList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<HpcmDto> result = helpService.getHpcmList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "도움말 상세 조회", description = "도움말 상세 정보를 조회합니다.")
    @GetMapping("/hpcm/{hlpSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#getHpcm')")
    public ResponseEntity<ApiResponse<HpcmDto>> getHpcm(
            @Parameter(description = "도움말 일련번호") @PathVariable Long hlpSn) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getHpcm(hlpSn)));
    }

    @Operation(summary = "도움말 등록", description = "새로운 도움말을 등록합니다.")
    @PostMapping("/hpcm")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#insertHpcm')")
    public ResponseEntity<ApiResponse<Long>> insertHpcm(@Valid @RequestBody HpcmDto dto) {
        Long hlpSn = helpService.createHpcm(dto);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.created(hlpSn));
    }

    @Operation(summary = "도움말 수정", description = "도움말 정보를 수정합니다.")
    @PutMapping("/hpcm/{hlpSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#updateHpcm')")
    public ResponseEntity<ApiResponse<Void>> updateHpcm(
            @PathVariable Long hlpSn,
            @Valid @RequestBody HpcmDto dto) {
        helpService.updateHpcm(hlpSn, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "도움말 삭제", description = "도움말 정보를 삭제합니다.")
    @DeleteMapping("/hpcm/{hlpSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#deleteHpcm')")
    public ResponseEntity<ApiResponse<Void>> deleteHpcm(@PathVariable Long hlpSn) {
        helpService.deleteHpcm(hlpSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Online Manual

    @Operation(summary = "온라인 매뉴얼 목록 조회", description = "온라인 매뉴얼 목록을 페이징하여 조회합니다.")
    @GetMapping("/manuals")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#getManuals')")
    public ResponseEntity<ApiResponse<PageResponse<OnlineManualDto>>> getManuals(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<OnlineManualDto> result = helpService.getOnlineManualList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "온라인 매뉴얼 상세 조회", description = "특정 온라인 매뉴얼의 상세 정보를 조회합니다.")
    @GetMapping("/manuals/{onlnMnlSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#getManual')")
    public ResponseEntity<ApiResponse<OnlineManualDto>> getManual(
            @Parameter(description = "매뉴얼 일련번호") @PathVariable Long onlnMnlSn) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getOnlineManual(onlnMnlSn)));
    }

    @Operation(summary = "온라인 매뉴얼 등록", description = "새로운 온라인 매뉴얼을 등록합니다.")
    @PostMapping("/manuals")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#createManual')")
    public ResponseEntity<ApiResponse<Long>> createManual(@Valid @RequestBody OnlineManualDto dto) {
        Long onlnMnlSn = helpService.createOnlineManual(dto);
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(ApiResponse.created(onlnMnlSn));
    }

    @Operation(summary = "온라인 매뉴얼 수정", description = "온라인 매뉴얼 정보를 수정합니다.")
    @PutMapping("/manuals/{onlnMnlSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#updateManual')")
    public ResponseEntity<ApiResponse<Void>> updateManual(
            @PathVariable Long onlnMnlSn,
            @Valid @RequestBody OnlineManualDto dto) {
        helpService.updateOnlineManual(onlnMnlSn, dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "온라인 매뉴얼 삭제", description = "온라인 매뉴얼 정보를 삭제합니다.")
    @DeleteMapping("/manuals/{onlnMnlSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#deleteManual')")
    public ResponseEntity<ApiResponse<Void>> deleteManual(@PathVariable Long onlnMnlSn) {
        helpService.deleteOnlineManual(onlnMnlSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 일반 사용자 열람(2026-10-19). 관리 화면이 등록한 도움말·매뉴얼을 도움말 센터가 읽는다. 로그인한 사용자 누구나 읽는 안내라
    //   인가는 AUTHENTICATED 이고(관리 목록은 HELP_READ 그대로), 응답은 등록자 ID 를 뺀 공개용 DTO 이며 순서는 서버가 정한다.

    @Operation(summary = "도움말 열람 목록", description = "로그인한 사용자가 읽는 도움말 목록입니다. 제목 가나다순으로 페이징합니다.")
    @GetMapping("/public-hpcm")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#getPublicHpcmList')")
    public ResponseEntity<ApiResponse<PageResponse<PublicHpcmDto>>> getPublicHpcmList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(helpService.getPublicHpcmList(keyword, pageable))));
    }

    @Operation(summary = "온라인 매뉴얼 열람 목록", description = "로그인한 사용자가 읽는 온라인 매뉴얼 목록입니다. 매뉴얼 명 가나다순으로 페이징합니다.")
    @GetMapping("/public-manuals")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.help.HelpApiController#getPublicManuals')")
    public ResponseEntity<ApiResponse<PageResponse<PublicOnlineManualDto>>> getPublicManuals(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(helpService.getPublicOnlineManualList(keyword, pageable))));
    }
}
