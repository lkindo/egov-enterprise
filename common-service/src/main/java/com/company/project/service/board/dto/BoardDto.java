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

    @Schema(description = "게시물 작성자 ID")
    private final String ntcrId;

    @Schema(description = "최초 등록자 ID")
    private final String frstRegisterId;

    @Schema(description = "최종 수정자 ID")
    private final String lastUpdusrId;

    @Schema(description = "최종 수정일시")
    private final LocalDateTime lastUpdtPnttm;

    @Schema(description = "비밀번호")
    private final String password;

    @Schema(description = "비밀글 여부")
    private final String secretAt;

    @Schema(description = "블로그 여부")
    private final String blogAt;

    @Schema(description = "댓글 수")
    private final Long commentCo;

    @Schema(description = "게시판 명")
    private final String bbsNm;

    public static BoardDto from(Board entity) {
        // ... (existing from method)
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
                .isExpired(getExpiredFlag(entity.getNtceEndde()))
                .frstRegisterPnttmStr(entity.getCreatedDate() != null
                        ? entity.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .ntcrId(entity.getNtcrId())
                .frstRegisterId(entity.getFrstRegisterId())
                .lastUpdtPnttm(entity.getModifiedDate())
                .password(entity.getPassword())
                .secretAt(entity.getSecretAt())
                .blogAt(entity.getBlogId() != null ? "Y" : "N")
                .commentCo(0L)
                .build();
    }

    public static BoardDto from(com.company.project.domain.board.BoardSearchResult result) {
        return BoardDto.builder()
                .id(result.getNttId())
                .bbsId(result.getBbsId())
                .nttSj(result.getNttSj())
                .ntcrNm(result.getFrstRegisterNm())
                .inqireCo(result.getInqireCo())
                .frstRegisterPnttm(result.getCreatedDate())
                .atchFileId(result.getAtchFileId())
                .parnts(String.valueOf(result.getParnts()))
                .replyAt(result.getReplyAt())
                .replyLc(result.getReplyLc())
                .ntceBgnde(result.getNtceBgnde())
                .ntceEndde(result.getNtceEndde())
                .useAt(result.getUseAt())
                .isExpired(getExpiredFlag(result.getNtceEndde()))
                .frstRegisterPnttmStr(result.getCreatedDate() != null
                        ? result.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .frstRegisterId(result.getFrstRegisterId())
                .secretAt(result.getSecretAt())
                .commentCo(result.getCommentCo())
                .build();
    }

    public static BoardDto from(com.company.project.domain.board.BoardDetailResult detail) {
        return BoardDto.builder()
                .id(detail.getNttId())
                .bbsId(detail.getBbsId())
                .nttSj(detail.getNttSj())
                .nttCn(detail.getNttCn())
                .ntcrNm(detail.getFrstRegisterNm())
                .inqireCo(detail.getInqireCo())
                .frstRegisterPnttm(detail.getCreatedDate())
                .atchFileId(detail.getAtchFileId())
                .nttNo(detail.getNttNo())
                .sortOrdr(detail.getSortOrdr())
                .parnts(String.valueOf(detail.getParnts()))
                .replyAt(detail.getReplyAt())
                .replyLc(detail.getReplyLc())
                .ntceBgnde(detail.getNtceBgnde())
                .ntceEndde(detail.getNtceEndde())
                .useAt(detail.getUseAt())
                .isExpired(getExpiredFlag(detail.getNtceEndde()))
                .frstRegisterPnttmStr(detail.getCreatedDate() != null
                        ? detail.getCreatedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                        : "")
                .ntcrId(detail.getNtcrId())
                .frstRegisterId(detail.getFrstRegisterId())
                .password(detail.getPassword())
                .secretAt(detail.getSecretAt())
                .bbsNm(detail.getBbsNm())
                .build();
    }

    private static String getExpiredFlag(String ntceEndde) {
        if (ntceEndde == null || ntceEndde.isEmpty()) return "N";
        String today = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return ntceEndde.compareTo(today) < 0 ? "Y" : "N";
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
