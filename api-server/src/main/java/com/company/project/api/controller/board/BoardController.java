package com.company.project.api.controller.board;

import com.company.project.core.response.ApiResponse;

import com.company.project.service.board.BoardService;

import com.company.project.service.board.dto.BoardDto;

import com.company.project.service.board.dto.BoardSaveRequest;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.Parameter;

import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.Pageable;

import org.springframework.data.web.PageableDefault;

import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.web.bind.annotation.*;

@Tag(name = "Board", description = "Board Management APIs")

@RestController

@RequestMapping("/api/v1/boards")

@RequiredArgsConstructor

public class BoardController {

        private final BoardService boardService;

@Operation(summary = "         ?      ?            ?         ??(??              )", description = "?     ??         ??   ?             ?      ?            ????                          ??         ???      ??")

        @GetMapping("/{bbsId}")

        public ResponseEntity<ApiResponse<Page<BoardDto>>> getPosts(

                        @Parameter(description = "         ???ID", example = "BBS_000000000001") @PathVariable String bbsId,

                        @PageableDefault(size = 10) Pageable pageable) {

                return ResponseEntity.ok(ApiResponse.success(boardService.getBoardPosts(bbsId, pageable)));

        }

@Operation(summary = "         ?      ??                   ??", description = "?     ??         ?      ?       ?          ??      ??         ???      ??")

        @GetMapping("/{bbsId}/posts/{id}")

        public ResponseEntity<ApiResponse<BoardDto>> getPost(

                        @Parameter(description = "         ???ID", example = "BBS_000000000001") @PathVariable String bbsId,

                        @Parameter(description = "         ?      ?ID", example = "1") @PathVariable Long id) {

                return ResponseEntity.ok(ApiResponse.success(boardService.getPostDetail(bbsId, id)));

        }

@Operation(summary = "         ?      ??         ", description = "??      ??         ?      ?       ?         ??      ??")

        @PostMapping("/posts")

        public ResponseEntity<ApiResponse<Long>> createPost(

                        @AuthenticationPrincipal UserDetails userDetails,

                        @Valid @RequestBody BoardSaveRequest request) {

                return ResponseEntity

                                .ok(ApiResponse.success(boardService.createPost(userDetails.getUsername(), request)));

        }

@Operation(summary = "         ?      ?????", description = "?     ??         ?      ?       ?????      ?? ?     ?          ?   ?    ?         ??         ?      ?        ?        ??      .")

        @DeleteMapping("/{bbsId}/posts/{id}")

        public ResponseEntity<ApiResponse<Void>> deletePost(

                        @AuthenticationPrincipal UserDetails userDetails,

                        @Parameter(description = "         ???ID", example = "BBS_000000000001") @PathVariable String bbsId,

                        @Parameter(description = "         ?      ?ID", example = "1") @PathVariable Long id) {

                boardService.deletePost(bbsId, id, userDetails.getUsername());

                return ResponseEntity.ok(ApiResponse.success(null));

        }

}

