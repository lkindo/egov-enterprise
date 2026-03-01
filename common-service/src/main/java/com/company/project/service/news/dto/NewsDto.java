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
@Schema(description = "?¥Ïä§ ?ïÎ≥¥")
public class NewsDto {
    @Schema(description = "?¥Ïä§ ID")
    private String newsId;
    @Schema(description = "?¥Ïä§ ?úÎ™©")
    private String newsSj;
    @Schema(description = "?¥Ïä§ ?¥Ïö©")
    private String newsCn;
    @Schema(description = "?¥Ïä§ Ï∂úÏ≤ò")
    private String newsOrigin;
    @Schema(description = "Í≤åÏãú??)
    private String ntceDe;
    @Schema(description = "Ï≤®Î? ?åÏùº ID")
    private String atchFileId;
    @Schema(description = "?ëÏÑ±??ID")
    private String frstRegisterId;
    @Schema(description = "?ëÏÑ± ?ºÏãú")
    private LocalDateTime frstRegisterPnttm;
    @Schema(description = "ÏµúÏ¢Ö ?òÏ†ï??ID")
    private String lastUpdusrId;
    @Schema(description = "ÏµúÏ¢Ö ?òÏ†ï ?ºÏãú")
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
