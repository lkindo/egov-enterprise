package com.company.project.api.controller.note;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.note.NoteService;
import com.company.project.service.note.dto.NoteDto;
import com.company.project.service.note.dto.NoteRecptnDto;
import com.company.project.service.note.dto.NoteTrnsmitDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Note", description = "Internal Note/Message Management APIs")
@RestController("prototypeNoteController")
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @Operation(summary = "Send Note")
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> sendNote(@RequestBody NoteDto noteDto,
            @RequestParam List<String> receiverIds) throws Exception {
        // Placeholder for senderId.
        noteService.sendNote(noteDto, receiverIds, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Get Sent Notes")
    @GetMapping("/sent")
    public ResponseEntity<ApiResponse<Page<NoteTrnsmitDto>>> getSentNotes(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getSentNotes("ADMIN", pageable)));
    }

    @Operation(summary = "Get Received Notes")
    @GetMapping("/received")
    public ResponseEntity<ApiResponse<Page<NoteRecptnDto>>> getReceivedNotes(Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getReceivedNotes("ADMIN", pageable)));
    }

    @Operation(summary = "Get Note Detail")
    @GetMapping("/{noteId}")
    public ResponseEntity<ApiResponse<NoteDto>> getNoteDetail(@PathVariable String noteId, @RequestParam String type) {
        return ResponseEntity.ok(ApiResponse.success(noteService.getNoteDetail(noteId, "ADMIN", type)));
    }

    @Operation(summary = "Delete Sent Note")
    @DeleteMapping("/sent/{trnsmitId}")
    public ResponseEntity<ApiResponse<Void>> deleteSentNote(@PathVariable String trnsmitId) {
        noteService.deleteSentNote(trnsmitId, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "Delete Received Note")
    @DeleteMapping("/received/{recptnId}")
    public ResponseEntity<ApiResponse<Void>> deleteReceivedNote(@PathVariable String recptnId) {
        noteService.deleteReceivedNote(recptnId, "ADMIN");
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
