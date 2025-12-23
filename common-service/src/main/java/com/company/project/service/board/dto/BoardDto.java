package com.company.project.service.board.dto;

import com.company.project.domain.board.Board;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "게시글 정보")
public record BoardDto(
        @Schema(description = "게시글 ID", example = "1") Long id,

        @Schema(description = "게시판 ID", example = "BBS_000000000001") String bbsId,

        @Schema(description = "게시글 제목", example = "공지사항입니다.") String nttSj,

        @Schema(description = "게시글 내용", example = "내용입니다.") String nttCn,

        @Schema(description = "작성자명", example = "홍길동") String ntcrNm,

        @Schema(description = "조회수", example = "10") Integer inqireCo,

        @Schema(description = "등록일시", example = "2023-12-21T17:00:00") LocalDateTime frstRegisterPnttm,
        @Schema(description = "첨부파일 ID", example = "FILE_000000000001") String atchFileId,
        @Schema(description = "게시물 번호") Long nttNo,
        @Schema(description = "정렬 순서") Long sortOrdr,
        @Schema(description = "부모 게시물 번호") String parnts,
        @Schema(description = "답변 여부") String replyAt,
        @Schema(description = "답변 위치") Integer replyLc,
        @Schema(description = "게시 시작일") String ntceBgnde,
        @Schema(description = "게시 종료일") String ntceEndde) {
    public static BoardDto from(Board entity) {
        return new BoardDto(
                entity.getId(),
                entity.getBoardMaster().getBbsId(),
                entity.getNttSj(),
                entity.getNttCn(),
                entity.getAuthor() != null ? entity.getAuthor().getUserNm() : entity.getNtcrNm(),
                entity.getInqireCo(),
                entity.getCreatedDate(),
                entity.getAtchFileId(),
                entity.getNttNo(),
                entity.getSortOrdr(),
                entity.getParnts(),
                entity.getReplyAt(),
                entity.getReplyLc(),
                entity.getNtceBgnde(),
                entity.getNtceEndde());
    }
}
