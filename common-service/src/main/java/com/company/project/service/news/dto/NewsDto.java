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
@Schema(description = "?�스 ?�보")
public class NewsDto {
    @Schema(description = "?�스 ID")
    private String newsId;
    @Schema(description = "?�스 ?�목")
    private String newsSj;
    @Schema(description = "?�스 ?�용")
    private String newsCn;
    @Schema(description = "?�스 출처")
    private String newsOrigin;
    @Schema(description = "게시??)")
    private String ntceDe;
    @Schema(description = "첨�? ?�일 ID")
    private String atchFileId;
    @Schema(description = "?�성??ID")
    private String frstRegisterId;
    @Schema(description = "?�성 ?�시")
    private LocalDateTime frstRegisterPnttm;
    @Schema(description = "최종 ?�정??ID")
    private String lastUpdusrId;
    @Schema(description = "최종 ?�정 ?�시")
    private LocalDateTime lastUpdusrPnttm;

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
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
