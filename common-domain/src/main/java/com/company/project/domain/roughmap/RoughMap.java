package com.company.project.domain.roughmap;

import com.company.project.domain.common.BaseTimeEntity;
import lombok.*;

import jakarta.persistence.*;

/**
 * 약도 관리 엔티티
 */
@Entity
@Table(name = "NROUGHMAP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RoughMap extends BaseTimeEntity {

    @Id
    @Column(name = "ROUGHMAP_ID", length = 20)
    private String roughMapId;

    @Column(name = "ROUGHMAPSJ", length = 75, nullable = false)
    private String roughMapSj;

    @Column(name = "ROUGHMAPADDRESS", length = 100)
    private String roughMapAddress;

    @Column(name = "LA", length = 255)
    private String la;

    @Column(name = "LO", length = 255)
    private String lo;

    @Column(name = "MARKERLA", length = 255)
    private String markerLa;

    @Column(name = "MARKERLO", length = 255)
    private String markerLo;

    @Column(name = "INFOWINDOW", length = 255)
    private String infoWindow;

    @Column(name = "ZOOMLEVEL", length = 3)
    private String zoomLevel;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String roughMapSj, String roughMapAddress, String la, String lo, String markerLa,
            String markerLo, String infoWindow, String zoomLevel, String lastUpdusrId) {
        this.roughMapSj = roughMapSj;
        this.roughMapAddress = roughMapAddress;
        this.la = la;
        this.lo = lo;
        this.markerLa = markerLa;
        this.markerLo = markerLo;
        this.infoWindow = infoWindow;
        this.zoomLevel = zoomLevel;
        this.lastUpdusrId = lastUpdusrId;
    }
}
