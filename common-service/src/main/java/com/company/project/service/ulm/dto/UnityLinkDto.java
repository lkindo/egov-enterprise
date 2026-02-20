package com.company.project.service.ulm.dto;

import com.company.project.domain.ulm.UnityLink;
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
@Schema(description = "Description")
public class UnityLinkDto {

    @Schema(description = "Description")
    private String unityLinkId;

    @Schema(description = "Description")
    private String unityLinkSeCode;

    @Schema(description = "Description")
    private String unityLinkNm;

    @Schema(description = "Description")
    private String unityLinkUrl;

    @Schema(description = "Description")
    private String unityLinkDc;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static UnityLinkDto from(UnityLink entity) {
        if (entity == null) return null;
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
