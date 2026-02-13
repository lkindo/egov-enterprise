package com.company.project.api.controller.help;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.help.EgovHelpService;
import com.company.project.service.help.dto.AdministrationWordDto;
import com.company.project.service.help.dto.HpcmDto;
import com.company.project.service.help.dto.OnlineManualDto;
import com.company.project.service.help.dto.WordDicaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Help", description = "Administration Word, Help, Manual, and Dictionary APIs")
@RestController
@RequestMapping("/api/v1/help")
@RequiredArgsConstructor
public class HelpController {

    private final EgovHelpService helpService;

    // Administration Word
    @Operation(summary = "행정용어 목록 조회")
    @GetMapping("/words")
    public ResponseEntity<ApiResponse<Page<AdministrationWordDto>>> getWords(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getAdministrationWordList(keyword, pageable)));
    }

    @Operation(summary = "행정용어 상세 조회")
    @GetMapping("/words/{wordId}")
    public ResponseEntity<ApiResponse<AdministrationWordDto>> getWord(
            @Parameter(description = "용어 ID") @PathVariable String wordId) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getAdministrationWord(wordId)));
    }

    @Operation(summary = "행정용어 등록")
    @PostMapping("/words")
    public ResponseEntity<ApiResponse<String>> insertWord(@RequestBody AdministrationWordDto dto) {
        String id = helpService.createAdministrationWord("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "행정용어 수정")
    @PutMapping("/words/{wordId}")
    public ResponseEntity<ApiResponse<Void>> updateWord(
            @PathVariable String wordId,
            @RequestBody AdministrationWordDto dto) {
        helpService.updateAdministrationWord(wordId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "행정용어 삭제")
    @DeleteMapping("/words/{wordId}")
    public ResponseEntity<ApiResponse<Void>> deleteWord(@PathVariable String wordId) {
        helpService.deleteAdministrationWord(wordId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // HPCM (Help)
    @Operation(summary = "도움말 목록 조회")
    @GetMapping("/hpcm")
    public ResponseEntity<ApiResponse<Page<HpcmDto>>> getHpcmList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getHpcmList(keyword, pageable)));
    }

    @Operation(summary = "도움말 상세 조회")
    @GetMapping("/hpcm/{hpcmId}")
    public ResponseEntity<ApiResponse<HpcmDto>> getHpcm(
            @Parameter(description = "도움말 ID") @PathVariable String hpcmId) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getHpcm(hpcmId)));
    }

    @Operation(summary = "도움말 등록")
    @PostMapping("/hpcm")
    public ResponseEntity<ApiResponse<String>> insertHpcm(@RequestBody HpcmDto dto) {
        String id = helpService.createHpcm("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "도움말 수정")
    @PutMapping("/hpcm/{hpcmId}")
    public ResponseEntity<ApiResponse<Void>> updateHpcm(
            @PathVariable String hpcmId,
            @RequestBody HpcmDto dto) {
        helpService.updateHpcm(hpcmId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "도움말 삭제")
    @DeleteMapping("/hpcm/{hpcmId}")
    public ResponseEntity<ApiResponse<Void>> deleteHpcm(@PathVariable String hpcmId) {
        helpService.deleteHpcm(hpcmId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Online Manual
    @Operation(summary = "온라인매뉴얼 목록 조회")
    @GetMapping("/manuals")
    public ResponseEntity<ApiResponse<Page<OnlineManualDto>>> getManuals(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getOnlineManualList(keyword, pageable)));
    }

    @Operation(summary = "온라인매뉴얼 상세 조회")
    @GetMapping("/manuals/{mnlId}")
    public ResponseEntity<ApiResponse<OnlineManualDto>> getManual(
            @Parameter(description = "매뉴얼 ID") @PathVariable String mnlId) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getOnlineManual(mnlId)));
    }

    @Operation(summary = "온라인매뉴얼 등록")
    @PostMapping("/manuals")
    public ResponseEntity<ApiResponse<String>> insertManual(@RequestBody OnlineManualDto dto) {
        String id = helpService.createOnlineManual("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "온라인매뉴얼 수정")
    @PutMapping("/manuals/{mnlId}")
    public ResponseEntity<ApiResponse<Void>> updateManual(
            @PathVariable String mnlId,
            @RequestBody OnlineManualDto dto) {
        helpService.updateOnlineManual(mnlId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "온라인매뉴얼 삭제")
    @DeleteMapping("/manuals/{mnlId}")
    public ResponseEntity<ApiResponse<Void>> deleteManual(@PathVariable String mnlId) {
        helpService.deleteOnlineManual(mnlId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Word Dictionary
    @Operation(summary = "용어사전 목록 조회")
    @GetMapping("/dictionary")
    public ResponseEntity<ApiResponse<Page<WordDicaryDto>>> getDictionary(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getWordDicaryList(keyword, pageable)));
    }

    @Operation(summary = "용어사전 상세 조회")
    @GetMapping("/dictionary/{wordId}")
    public ResponseEntity<ApiResponse<WordDicaryDto>> getWordDicary(
            @Parameter(description = "용어 ID") @PathVariable String wordId) {
        return ResponseEntity.ok(ApiResponse.success(helpService.getWordDicary(wordId)));
    }

    @Operation(summary = "용어사전 등록")
    @PostMapping("/dictionary")
    public ResponseEntity<ApiResponse<String>> insertWordDicary(@RequestBody WordDicaryDto dto) {
        String id = helpService.createWordDicary("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "용어사전 수정")
    @PutMapping("/dictionary/{wordId}")
    public ResponseEntity<ApiResponse<Void>> updateWordDicary(
            @PathVariable String wordId,
            @RequestBody WordDicaryDto dto) {
        helpService.updateWordDicary(wordId, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "용어사전 삭제")
    @DeleteMapping("/dictionary/{wordId}")
    public ResponseEntity<ApiResponse<Void>> deleteWordDicary(@PathVariable String wordId) {
        helpService.deleteWordDicary(wordId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
