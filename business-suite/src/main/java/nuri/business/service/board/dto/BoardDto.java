package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Builder;
import java.time.LocalDateTime;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardSearchResult;
import nuri.business.domain.board.BoardDetailResult;

/**
 * 게시글 정보 DTO (v5 standardized - Record 버전)
 */
@Builder
public record BoardDto(
    @Schema(description = "게시글 ID")
    @Size(max = 20)
    String pstId,

    @Schema(description = "게시판 ID")
    @Size(max = 20)
    String bbsId,

    @Schema(description = "답글 번호")
    Long ansSn,

    @Schema(description = "제목")
    @Size(max = 100)
    String pstTtl,

    @Schema(description = "내용")
    @Size(max = 4000)
    String pstCn,

    @Schema(description = "상위 게시글 ID")
    @Size(max = 20)
    String upPstId,

    @Schema(description = "정렬 순서")
    Long sortOrdr,

    @Schema(description = "제목 굵게 표시 여부")
    @Size(max = 1)
    String ttlBoldYn,

    @Schema(description = "조회수")
    Integer inqCnt,

    @Schema(description = "사용 여부")
    @Size(max = 1)
    @NotBlank
    String useYn,

    @Schema(description = "게시 시작일")
    @Size(max = 20)
    String pstBgngYmd,

    @Schema(description = "게시 종료일")
    @Size(max = 20)
    String pstEndYmd,

    @Schema(description = "작성자 ID")
    @Size(max = 20)
    @NotBlank
    String userId,

    @Schema(description = "작성자명")
    @Size(max = 100)
    String userNm,

    @Schema(description = "비밀번호")
    @Size(max = 200)
    String pswd,

    @Schema(description = "첨부파일 ID")
    @Size(max = 30)
    String atchFileId,

    @Schema(description = "비밀글 여부")
    @Size(max = 1)
    String scrtYn,

    @Schema(description = "블로그 ID")
    @Size(max = 20)
    String blogId,

    @Schema(description = "행사일")
    LocalDateTime evntDt,

    @Schema(description = "QNA 상태")
    String qnaSttsCd,

    @Schema(description = "QNA 카테고리")
    @Size(max = 12)
    String qnaCatCd,

    @Schema(description = "좋아요수")
    Integer likeCnt,

    @Schema(description = "댓글수")
    Integer commentCnt,

    @Schema(description = "파일수")
    Integer fileCnt,

    @Schema(description = "등록일시")
    LocalDateTime crtDt,

    @Schema(description = "등록자명")
    String frstRegisterNm,

    @Schema(description = "답글 단계")
    Integer ansLv
) {
    public static BoardDto from(Board entity) {
        if (entity == null) return null;
        return BoardDto.builder()
                .pstId(entity.getPstId())
                .bbsId(entity.getBbsId())
                .ansSn(entity.getAnsSn())
                .pstTtl(entity.getPstTtl())
                .pstCn(entity.getPstCn())
                .upPstId(entity.getUpPstId())
                .sortOrdr(entity.getSortOrdr())
                .ttlBoldYn(entity.getTtlBoldYn())
                .inqCnt(entity.getInqCnt())
                .useYn(entity.getUseYn())
                .pstBgngYmd(entity.getPstBgngYmd())
                .pstEndYmd(entity.getPstEndYmd())
                .userId(entity.getUserId())
                .userNm(entity.getUserNm())
                .pswd(entity.getPswd())
                .atchFileId(entity.getAtchFileId())
                .scrtYn(entity.getScrtYn())
                .blogId(entity.getBlogId())
                .evntDt(entity.getEvntDt())
                .qnaSttsCd(entity.getQnaSttsCd())
                .qnaCatCd(entity.getQnaCatCd())
                .likeCnt(entity.getLikeCnt())
                .commentCnt(entity.getCmntCnt())
                .fileCnt(entity.getFileCnt())
                .crtDt(entity.getCrtDt())
                .ansLv(entity.getAnsLv())
                .build();
    }

    public static BoardDto from(BoardSearchResult result) {
        if (result == null) return null;
        return BoardDto.builder()
                .pstId(result.getPstId())
                .bbsId(result.getBbsId())
                .ansSn(result.getAnsSn())
                .pstTtl(result.getPstTtl())
                .upPstId(result.getUpPstId())
                .ttlBoldYn(result.getTtlBoldYn())
                .inqCnt(result.getInqCnt())
                .useYn(result.getUseYn())
                .pstBgngYmd(result.getPstBgngYmd())
                .pstEndYmd(result.getPstEndYmd())
                .userId(result.getFrstRgtrId())
                .userNm(result.getUserNm())
                .atchFileId(result.getAtchFileId())
                .scrtYn(result.getScrtYn())
                .evntDt(result.getEvntDt())
                .qnaSttsCd(result.getQnaSttsCd())
                .qnaCatCd(result.getQnaCatCd())
                .likeCnt(result.getLikeCnt())
                .commentCnt(result.getCommentCnt())
                .crtDt(result.getCrtDt())
                .ansLv(result.getAnsLv())
                .build();
    }

    public static BoardDto from(BoardDetailResult detail) {
        if (detail == null) return null;
        return BoardDto.builder()
                .pstId(detail.getPstId())
                .bbsId(detail.getBbsId())
                .ansSn(detail.getAnsSn())
                .pstTtl(detail.getPstTtl())
                .pstCn(detail.getPstCn())
                .upPstId(detail.getUpPstId())
                .sortOrdr(detail.getSortOrdr())
                .ttlBoldYn(detail.getTtlBoldYn())
                .inqCnt(detail.getInqCnt())
                .useYn(detail.getUseYn())
                .pstBgngYmd(detail.getPstBgngYmd())
                .pstEndYmd(detail.getPstEndYmd())
                .userId(detail.getUserId())
                .userNm(detail.getUserNm())
                .pswd(detail.getPswd())
                .atchFileId(detail.getAtchFileId())
                .scrtYn(detail.getScrtYn())
                .evntDt(detail.getEvntDt())
                .qnaSttsCd(detail.getQnaSttsCd())
                .qnaCatCd(detail.getQnaCatCd())
                .likeCnt(detail.getLikeCnt())
                .commentCnt(detail.getCommentCnt())
                .crtDt(detail.getCrtDt())
                .ansLv(detail.getAnsLv())
                .build();
    }
}
