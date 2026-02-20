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

@Operation(summary = "         ?          ?             ?         ??", description = "         ??          ????   ?             ?          ?             ??         ???      ??")

    @GetMapping("/received")

    public ResponseEntity<ApiResponse<Page<NoteDto>>> getReceivedNotes(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(

                noteService.getReceivedNotes(userDetails.getUsername(), searchWrd, pageable)));

    }

@Operation(summary = "      ?   ?         ?             ?         ??", description = "         ??          ????   ?          ?   ?         ?             ??         ???      ??")

    @GetMapping("/sent")

    public ResponseEntity<ApiResponse<Page<NoteDto>>> getSentNotes(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestParam(required = false) String searchWrd,

            @PageableDefault(size = 10) Pageable pageable) {

        return ResponseEntity.ok(ApiResponse.success(

                noteService.getSentNotes(userDetails.getUsername(), searchWrd, pageable)));

    }

@Operation(summary = "         ? ?                   ??", description = "         ????          ??      ??         ???      ??")

    @GetMapping("/{noteId}")

    public ResponseEntity<ApiResponse<NoteDto>> getNote(

            @Parameter(description = "         ? ID") @PathVariable String noteId,

            @RequestParam String type, // recv, sent

            @RequestParam String relationId) { // noteRecptnId or noteTrnsmitId

        return ResponseEntity.ok(ApiResponse.success(noteService.getNoteDetail(noteId, type, relationId)));

    }

@Operation(summary = "         ?          ??", description = "??      ??         ???         ???      ??")

    @PostMapping

    public ResponseEntity<ApiResponse<Void>> sendNote(

            @AuthenticationPrincipal UserDetails userDetails,

            @RequestBody NoteDto noteDto) {

        noteService.sendNote(userDetails.getUsername(), noteDto);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

@Operation(summary = "         ? ????", description = "         ?          ? ?   ?          ?   ?         ????????      ??")

    @DeleteMapping("/{relationId}")

    public ResponseEntity<ApiResponse<Void>> deleteNote(

            @Parameter(description = "?     ??ID (??      ID ?   ?             ?   D)") @PathVariable String relationId,

            @RequestParam String type) { // recv, sent

        noteService.deleteNote(relationId, type);

        return ResponseEntity.ok(ApiResponse.success(null));

    }

}

