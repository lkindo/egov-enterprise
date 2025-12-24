package com.company.project.service.board.dto;

import com.company.project.domain.board.Board;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "게시글 정보")
@lombok.Data
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
@lombok.Builder
public class BoardDto {

    @Schema(description = "게시글 ID", example = "1")
    private Long id;

    @Schema(description = "게시판 ID", example = "BBS_000000000001")
    private String bbsId;

    @Schema(description = "게시글 제목", example = "공지사항입니다.")
    private String nttSj;

    @Schema(description = "게시글 내용", example = "내용입니다.")
    private String nttCn;

    @Schema(description = "작성자명", example = "홍길동")
    private String ntcrNm;

    @Schema(description = "조회수", example = "10")
    private Integer inqireCo;

    @Schema(description = "등록일시", example = "2023-12-21T17:00:00")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "첨부파일 ID", example = "FILE_000000000001")
    private String atchFileId;

    @Schema(description = "게시물 번호")
    private Long nttNo;

    @Schema(description = "정렬 순서")
    private Long sortOrdr;

    @Schema(description = "부모 게시물 번호")
    private String parnts;

    @Schema(description = "답변 여부")
    private String replyAt;

    @Schema(description = "답변 위치")
    private Integer replyLc;

    @Schema(description = "게시 시작일")
    private String ntceBgnde;

    @Schema(description = "게시 종료일")
    private String ntceEndde;

    public static BoardDto from(Board entity) {
        return BoardDto.builder()
                .id(entity.getId())
                .bbsId(entity.getBoardMaster().getBbsId())
                .nttSj(entity.getNttSj())
                .nttCn(entity.getNttCn())
                .ntcrNm(entity.getAuthor() != null ? entity.getAuthor().getUserNm() : entity.getNtcrNm())
                .inqireCo(entity.getInqireCo())
                .frstRegisterPnttm(entity.getCreatedDate())
                .atchFileId(entity.getAtchFileId())
                .nttNo(entity.getNttNo())
                .sortOrdr(entity.getSortOrdr())
                .parnts(entity.getParnts())
                .replyAt(entity.getReplyAt())
                .replyLc(entity.getReplyLc())
                .ntceBgnde(entity.getNtceBgnde())
                .ntceEndde(entity.getNtceEndde())
                .build();
    }
}
