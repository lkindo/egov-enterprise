package com.company.project.business.service.roughmap.dto;

import com.company.project.business.domain.roughmap.RoughMap;
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
public class RoughMapDto {

    @Schema(description = "Description")
    private String roughMapId;

    @Schema(description = "Description")
    private String roughMapSj;

    @Schema(description = "Description")
    private String roughMapAddress;

    @Schema(description = "Description")
    private String la;

    @Schema(description = "Description")
    private String lo;

    @Schema(description = "Description")
    private String markerLa;

    @Schema(description = "Description")
    private String markerLo;

    @Schema(description = "Description")
    private String infoWindow;

    @Schema(description = "Description")
    private String zoomLevel;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static RoughMapDto from(RoughMap entity) {
        if (entity == null) return null;
        return RoughMapDto.builder()
                .roughMapId(entity.getRoughMapId())
                .roughMapSj(entity.getRoughMapSj())
                .roughMapAddress(entity.getRoughMapAddress())
                .la(entity.getLa())
                .lo(entity.getLo())
                .markerLa(entity.getMarkerLa())
                .markerLo(entity.getMarkerLo())
                .infoWindow(entity.getInfoWindow())
                .zoomLevel(entity.getZoomLevel())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
