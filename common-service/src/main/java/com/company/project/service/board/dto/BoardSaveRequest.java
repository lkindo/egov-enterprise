package com.company.project.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.lang.NonNull;

@Schema(description = "게시글 저장 요청")
public record BoardSaveRequest(
        @Schema(description = "게시판 ID", example = "BBS_000000000001") @NotBlank(message = "게시판 ID는 필수 입력 항목입니다.") @NonNull String bbsId,

        @Schema(description = "게시글 제목", example = "공지사항 테스트입니다.") @NotBlank(message = "제목은 필수 입력 항목입니다.") @Size(min = 1, max = 100, message = "제목은 1자 이상 100자 이하로 입력해주세요.") @NonNull String nttSj,

        @Schema(description = "게시글 내용", example = "테스트 내용입니다.") @NotBlank(message = "내용은 필수 입력 항목입니다.") @NonNull String nttCn,

        @Schema(description = "게시 시작일", example = "2023-01-01") String ntceBgnde,

        @Schema(description = "게시 종료일", example = "2023-12-31") String ntceEndde,

        @Schema(description = "첨부파일 ID", example = "FILE_000000000001") String atchFileId) {
}
