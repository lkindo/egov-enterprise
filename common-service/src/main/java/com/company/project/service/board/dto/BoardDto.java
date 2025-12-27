package com.company.project.service.board.dto;

import com.company.project.domain.board.Board;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@Builder
@Schema(description = "게시글 정보")
public class BoardDto {
    @Schema(description = "게시글 ID", example = "1")
    private final Long id;

    @Schema(description = "게시판 ID", example = "BBS_000000000001")
    private final String bbsId;

    @Schema(description = "게시글 제목", example = "공지사항입니다.")
    private final String nttSj;

    @Schema(description = "게시글 내용", example = "내용입니다.")
    private final String nttCn;

    @Schema(description = "작성자명", example = "홍길동")
    private final String ntcrNm;

    @Schema(description = "조회수", example = "10")
    private final Integer inqireCo;

    @Schema(description = "등록일시", example = "2023-12-21T17:00:00")
    private final LocalDateTime frstRegisterPnttm;

    @Schema(description = "첨부파일 ID", example = "FILE_000000000001")
    private final String atchFileId;

    @Schema(description = "게시물 번호")
    private final Long nttNo;

    @Schema(description = "정렬 순서")
    private final Long sortOrdr;

    @Schema(description = "부모 게시물 번호")
    private final String parnts;

    @Schema(description = "답변 여부")
    private final String replyAt;

    @Schema(description = "답변 위치")
    private final Integer replyLc;

    @Schema(description = "게시 시작일")
    private final String ntceBgnde;

    @Schema(description = "게시 종료일")
    private final String ntceEndde;

    @Schema(description = "사용 여부")
    private final String useAt;

    @Schema(description = "만료 여부")
    private final String isExpired;

    @Schema(description = "등록일시 (포맷팅)", example = "2023-12-21")
    private final String frstRegisterPnttmStr;

    public static BoardDto from(Board entity) {
        String today = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String expired = "N";
        if (entity.getNtceEndde() != null && !entity.getNtceEndde().isEmpty()) {
            if (entity.getNtceEndde().compareTo(today) < 0) {
                expired = "Y";
            }
        }

        return BoardDto.builder()
                .id(entity.getNttId())
                .bbsId(entity.getBbsId())
                .nttSj(entity.getNttSj())
                .nttCn(entity.getNttCn())
                .ntcrNm(entity.getNtcrNm())
                .inqireCo(entity.getInqireCo())
                .frstRegisterPnttm(entity.getCreatedDate())
                .atchFileId(entity.getAtchFileId())
                .nttNo(entity.getNttNo())
                .sortOrdr(entity.getSortOrdr())
                .parnts(String.valueOf(entity.getParnts()))
                .replyAt(entity.getReplyAt())
                .replyLc(entity.getReplyLc())
                .ntceBgnde(entity.getNtceBgnde())
                .ntceEndde(entity.getNtceEndde())
                .useAt(entity.getUseAt())
                .isExpired(expired)
                .frstRegisterPnttmStr(entity.getCreatedDate() != null
                        ? entity.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .build();
    }

    // Compatibility getters for legacy JSP
    public Long getNttId() {
        return id;
    }

    public String getFrstRegisterNm() {
        return ntcrNm;
    }

    public String getCommentCo() {
        return "";
    }
}
