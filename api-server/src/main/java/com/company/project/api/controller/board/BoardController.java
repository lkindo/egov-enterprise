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

        @Operation(summary = "寃뚯떆湲 紐⑸줉 議고쉶 (?섏씠吏?", description = "?뱀젙 寃뚯떆?먯쓽 寃뚯떆湲 紐⑸줉???섏씠吏뺥븯??議고쉶?⑸땲??")
        @GetMapping("/{bbsId}")
        public ResponseEntity<ApiResponse<Page<BoardDto>>> getPosts(
                        @Parameter(description = "寃뚯떆??ID", example = "BBS_000000000001") @PathVariable String bbsId,
                        @PageableDefault(size = 10) Pageable pageable) {
                return ResponseEntity.ok(ApiResponse.success(boardService.getBoardPosts(bbsId, pageable)));
        }

        @Operation(summary = "寃뚯떆湲 ?곸꽭 議고쉶", description = "?뱀젙 寃뚯떆湲???곸꽭 ?댁슜??議고쉶?⑸땲??")
        @GetMapping("/posts/{id}")
        public ResponseEntity<ApiResponse<BoardDto>> getPost(
                        @Parameter(description = "寃뚯떆湲 ID", example = "1") @PathVariable Long id) {
                return ResponseEntity.ok(ApiResponse.success(boardService.getPostDetail(id)));
        }

        @Operation(summary = "寃뚯떆湲 ?깅줉", description = "?덈줈??寃뚯떆湲???깅줉?⑸땲??")
        @PostMapping("/posts")
        public ResponseEntity<ApiResponse<Long>> createPost(
                        @AuthenticationPrincipal UserDetails userDetails,
                        @Valid @RequestBody BoardSaveRequest request) {
                return ResponseEntity
                                .ok(ApiResponse.success(boardService.createPost(userDetails.getUsername(), request)));
        }

        @Operation(summary = "寃뚯떆湲 ??젣", description = "?뱀젙 寃뚯떆湲????젣?⑸땲?? 愿由ъ옄 ?먮뒗 ?묒꽦??蹂몄씤留?媛?ν빀?덈떎.")
        @DeleteMapping("/posts/{id}")
        public ResponseEntity<ApiResponse<Void>> deletePost(
                        @AuthenticationPrincipal UserDetails userDetails,
                        @Parameter(description = "寃뚯떆湲 ID", example = "1") @PathVariable Long id) {
                boardService.deletePost(id, userDetails.getUsername());
                return ResponseEntity.ok(ApiResponse.success(null));
        }
}
