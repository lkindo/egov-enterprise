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
@Schema(description = "통합 링크 정보")
public class UnityLinkDto {

    @Schema(description = "통합 링크 ID")
    private String unityLinkId;

    @Schema(description = "통합 링크 구분 코드")
    private String unityLinkCategoryCode;

    @Schema(description = "통합 링크 명칭")
    private String unityLinkName;

    @Schema(description = "통합 링크 URL")
    private String unityLinkUrl;

    @Schema(description = "통합 링크 설명")
    private String unityLinkDescription;

    @Schema(description = "생성자")
    private String createdBy;

    @Schema(description = "생성 일시")
    private LocalDateTime createdDate;

    public static UnityLinkDto from(UnityLink entity) {
        if (entity == null)
            return null;
        return UnityLinkDto.builder()
                .unityLinkId(entity.getUnityLinkId())
                .unityLinkCategoryCode(entity.getUnityLinkCategoryCode())
                .unityLinkName(entity.getUnityLinkName())
                .unityLinkUrl(entity.getUnityLinkUrl())
                .unityLinkDescription(entity.getUnityLinkDescription())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
