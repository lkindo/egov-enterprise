package com.company.project.service.news.dto;

import com.company.project.domain.news.News;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "뉴스 정보 DTO")
public class NewsDto {
    @Schema(description = "뉴스 ID")
    private String newsId;

    @Schema(description = "뉴스 제목")
    private String title;

    @Schema(description = "뉴스 내용")
    private String content;

    @Schema(description = "뉴스 출처")
    private String newsOrigin;

    @Schema(description = "게시 일자")
    private String noticeDate;

    @Schema(description = "첨부 파일 ID")
    private String atchFileId;

    @Schema(description = "최초 등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "최종 수정 일시")
    private LocalDateTime lastUpdusrPnttm;

    public static NewsDto from(News entity) {
        if (entity == null)
            return null;
        return NewsDto.builder()
                .newsId(entity.getNewsId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .newsOrigin(entity.getNewsOrigin())
                .noticeDate(entity.getNoticeDate())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}