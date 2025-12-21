package com.company.project.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "게시글 저장 요청")
public record BoardSaveRequest(
                @Schema(description = "게시판 ID", example = "BBS_000000000001") @NotBlank(message = "{validation.required}") String bbsId,

                @Schema(description = "게시글 제목", example = "공지사항 테스트입니다.") @NotBlank(message = "{validation.required}") @Size(min = 1, max = 100, message = "{validation.size}") String nttSj,

                @Schema(description = "게시글 내용", example = "테스트 내용입니다.") @NotBlank(message = "{validation.required}") String nttCn,

                @Schema(description = "게시 시작일", example = "2023-01-01") String ntceBgnde,

                @Schema(description = "게시 종료일", example = "2023-12-31") String ntceEndde,

                @Schema(description = "첨부파일 ID", example = "FILE_000000000001") String atchFileId) {
}
