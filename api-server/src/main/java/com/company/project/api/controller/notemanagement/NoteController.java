package com.company.project.api.controller.notemanagement;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.notemanagement.NoteService;
import com.company.project.service.notemanagement.dto.NoteDto;
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

@Tag(name = "Note", description = "ìª½ì? ê´€ë¦?API")
@RestController("notemanagementNoteController")
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @Operation(summary = "?˜ì‹  ìª½ì? ëª©ë¡ ì¡°íšŒ", description = "ë¡œê·¸?¸í•œ ?¬ìš©?ê? ?˜ì‹ ??ìª½ì? ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<Page<NoteDto>>> getReceivedNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                noteService.getReceivedNotes(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "ë°œì‹  ìª½ì? ëª©ë¡ ì¡°íšŒ", description = "ë¡œê·¸?¸í•œ ?¬ìš©?ê? ë°œì‹ ??ìª½ì? ëª©ë¡???˜ì´ì§•í•˜??ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/sent")
    public ResponseEntity<ApiResponse<Page<NoteDto>>> getSentNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                noteService.getSentNotes(userDetails.getUsername(), searchWrd, pageable)));
    }

    @Operation(summary = "ìª½ì? ?ì„¸ ì¡°íšŒ", description = "?¹ì • ìª½ì????ì„¸ ?•ë³´ë¥?ì¡°íšŒ?©ë‹ˆ??")
    @GetMapping("/{noteId}")
    public ResponseEntity<ApiResponse<NoteDto>> getNote(
            @Parameter(description = "ìª½ì? ID") @PathVariable String noteId,
            @Parameter(description = "ìª½ì? êµ¬ë¶„ (recv: ?˜ì‹ , sent: ë°œì‹ )") @RequestParam String type,
            @Parameter(description = "ê´€ê³?ID (?˜ì‹ ID ?ëŠ” ë°œì‹ ID)") @RequestParam String relationId) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getNoteDetail(noteId, type, relationId)));
    }

    @Operation(summary = "ìª½ì? ë°œì†¡", description = "?ˆë¡œ??ìª½ì?ë¥??‘ì„±?˜ì—¬ ë°œì†¡?©ë‹ˆ??")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> sendNote(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NoteDto noteDto) {
        noteService.sendNote(userDetails.getUsername(), noteDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "ìª½ì? ?? œ", description = "?˜ì‹  ?ëŠ” ë°œì‹  ê¸°ë¡?ì„œ ìª½ì?ë¥??? œ?©ë‹ˆ??")
    @DeleteMapping("/{relationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @Parameter(description = "ê´€ê³?ID") @PathVariable String relationId,
            @Parameter(description = "ìª½ì? êµ¬ë¶„ (recv: ?˜ì‹ , sent: ë°œì‹ )") @RequestParam String type) {
        noteService.deleteNote(relationId, type);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
