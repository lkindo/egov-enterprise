package com.company.project.service.roughmap.dto;

import com.company.project.domain.roughmap.RoughMap;
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
@Schema(description = "약도 정보 DTO")
public class RoughMapDto {

    @Schema(description = "약도 ID")
    private String roughMapId;

    @Schema(description = "약도 제목")
    private String roughMapSj;

    @Schema(description = "약도 주소")
    private String roughMapAddress;

    @Schema(description = "위도")
    private String la;

    @Schema(description = "경도")
    private String lo;

    @Schema(description = "마커 위도")
    private String markerLa;

    @Schema(description = "마커 경도")
    private String markerLo;

    @Schema(description = "정보 창 내용")
    private String infoWindow;

    @Schema(description = "줌 레벨")
    private String zoomLevel;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
