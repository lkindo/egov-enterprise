package com.company.project.service.roughmap.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoughMapDto {
    private String roughMapId;
    private String roughMapSj;
    private String roughMapAddress;
    private String la;
    private String lo;
    private String markerLa;
    private String markerLo;
    private String infoWindow;
    private String zoomLevel;
}
