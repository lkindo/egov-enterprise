package com.company.project.service.unitylink.dto;

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
@Schema(description = "통합 링크 정보")
public class UnityLinkDto {

    @Schema(description = "통합 링크 ID")
    private String unityLinkId;

    @Schema(description = "통합 링크 구분 코드")
    private String unityLinkSeCode;

    @Schema(description = "통합 링크 명칭")
    private String unityLinkNm;

    @Schema(description = "통합 링크 URL")
    private String unityLinkUrl;

    @Schema(description = "통합 링크 설명")
    private String unityLinkDc;

    @Schema(description = "생성자")
    private String createdBy;

    @Schema(description = "생성일")
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
