package com.company.project.service.nws.dto;

import com.company.project.domain.news.News;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static NewsDto from(News entity) {
        if (entity == null) return null;
        return NewsDto.builder()
                .newsId(entity.getNewsId())
                .newsSj(entity.getNewsSj())
                .newsCn(entity.getNewsCn())
                .newsOrigin(entity.getNewsOrigin())
                .ntceDe(entity.getNtceDe())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
