package com.company.project.api.controller.ntm;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.ntm.NoteService;
import com.company.project.service.ntm.dto.NoteDto;
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

@Tag(name = "Note", description = "Note Management APIs (Note, Reception, Transmission)")
@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @Operation(summary = "받은 쪽지 목록 조회", description = "로그인한 사용자의 받은 쪽지 목록을 조회합니다.")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<Page<NoteDto>>> getReceivedNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                noteService.getReceivedNotes(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "보낸 쪽지 목록 조회", description = "로그인한 사용자의 보낸 쪽지 목록을 조회합니다.")
    @GetMapping("/sent")
    public ResponseEntity<ApiResponse<Page<NoteDto>>> getSentNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                noteService.getSentNotes(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "쪽지 상세 조회", description = "쪽지의 상세 내용을 조회합니다.")
    @GetMapping("/{noteId}")
    public ResponseEntity<ApiResponse<NoteDto>> getNote(
            @Parameter(description = "쪽지 ID") @PathVariable String noteId,
            @RequestParam String type, // recv, sent
            @RequestParam String relationId) { // noteRecptnId or noteTrnsmitId
        return ResponseEntity.ok(ApiResponse.success(noteService.getNoteDetail(noteId, type, relationId)));
    }

    @Operation(summary = "쪽지 발송", description = "새로운 쪽지를 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> sendNote(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NoteDto noteDto) {
        noteService.sendNote(userDetails.getUsername(), noteDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "쪽지 삭제", description = "받은 쪽지 또는 보낸 쪽지를 삭제합니다.")
    @DeleteMapping("/{relationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @Parameter(description = "관계 ID (수신ID 또는 발신ID)") @PathVariable String relationId,
            @RequestParam String type) { // recv, sent
        noteService.deleteNote(relationId, type);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
