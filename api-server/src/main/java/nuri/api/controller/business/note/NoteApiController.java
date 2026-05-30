package nuri.api.controller.business.note;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.service.note.NoteService;
import nuri.business.service.note.dto.NoteDto;
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

/**
 * 쪽지 관리를 위한 API 컨트롤러
 */
@Tag(name = "Note", description = "쪽지 관리 API")
@RestController("noteNoteApiController")
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class NoteApiController {

    private final NoteService noteService;

    @Operation(summary = "수신 쪽지 목록 조회", description = "로그인한 사용자의 수신 쪽지 목록을 조회합니다.")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<PageResponse<NoteDto>>> getReceivedNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<NoteDto> result = noteService.getReceivedNotes(userDetails.getUsername(), searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "발신 쪽지 목록 조회", description = "로그인한 사용자의 발신 쪽지 목록을 조회합니다.")
    @GetMapping("/sent")
    public ResponseEntity<ApiResponse<PageResponse<NoteDto>>> getSentNotes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<NoteDto> result = noteService.getSentNotes(userDetails.getUsername(), searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "쪽지 상세 조회", description = "쪽지 상세 정보를 조회합니다.")
    @GetMapping("/{noteId}")
    public ResponseEntity<ApiResponse<NoteDto>> getNote(
            @Parameter(description = "쪽지 ID") @PathVariable String noteId,
            @Parameter(description = "쪽지 구분 (recv: 수신, sent: 발신)") @RequestParam String type,
            @Parameter(description = "관계 ID (수신ID 또는 발신ID)") @RequestParam String relationId) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getNoteDetail(noteId, type, relationId)));
    }

    @Operation(summary = "쪽지 발송", description = "새로운 쪽지를 작성하여 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> sendNote(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NoteDto noteDto) {
        noteService.sendNote(userDetails.getUsername(), noteDto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "쪽지 삭제", description = "수신 또는 발신 목록에서 쪽지를 삭제합니다.")
    @DeleteMapping("/{relationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(
            @Parameter(description = "관계 ID") @PathVariable String relationId,
            @Parameter(description = "쪽지 구분 (recv: 수신, sent: 발신)") @RequestParam String type) {
        noteService.deleteNote(relationId, type);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
