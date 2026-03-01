package com.company.project.service.unitylink.dto;

import com.company.project.domain.unitylink.UnityLink;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "?�합 링크 ?�보")
public class UnityLinkDto {

    @Schema(description = "?�합 링크 ID")
    private String unityLinkId;

    @Schema(description = "?�합 링크 구분 코드")
    private String unityLinkSeCode;

    @Schema(description = "?�합 링크 명칭")
    private String unityLinkNm;

    @Schema(description = "?�합 링크 URL")
    private String unityLinkUrl;

    @Schema(description = "?�합 링크 ?�명")
    private String unityLinkDc;

    @Schema(description = "?�성??)
    private String createdBy;

    @Schema(description = "?�성??)
    private LocalDateTime createdDate;

    public static UnityLinkDto from(UnityLink entity) {
        if (entity == null)
            return null;
        return UnityLinkDto.builder()
                .unityLinkId(entity.getUnityLinkId())
                .unityLinkSeCode(entity.getUnityLinkSeCode())
                .unityLinkNm(entity.getUnityLinkNm())
                .unityLinkUrl(entity.getUnityLinkUrl())
                .unityLinkDc(entity.getUnityLinkDc())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
