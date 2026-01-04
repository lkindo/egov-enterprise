package com.company.project.service.news.dto;

import com.company.project.domain.news.News;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 뉴스정보 DTO
 */
@Getter
@Builder
public class NewsDto {
    private String newsId;
    private String newsSj;
    private String newsCn;
    private String newsOrigin;
    private String ntceDe;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static NewsDto from(News entity) {
        if (entity == null)
            return null;
        return NewsDto.builder()
                .newsId(entity.getNewsId())
                .newsSj(entity.getNewsSj())
                .newsCn(entity.getNewsCn())
                .newsOrigin(entity.getNewsOrigin())
                .ntceDe(entity.getNtceDe())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
