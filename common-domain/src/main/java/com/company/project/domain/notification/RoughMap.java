package com.company.project.domain.notification;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "NROUGHMAP")
public class RoughMap {

    @Id
    @Column(name = "ROUGHMAP_ID", length = 20)
    private String roughMapId;

    @Column(name = "ROUGHMAPSJ", length = 255)
    private String roughMapSj;

    @Column(name = "ROUGHMAPADDRESS", length = 1000)
    private String roughMapAddress;

    @Column(name = "LA", length = 255)
    private String la;

    @Column(name = "LO", length = 255)
    private String lo;

    @Column(name = "MARKERLA", length = 255)
    private String markerLa;

    @Column(name = "MARKERLO", length = 255)
    private String markerLo;

    @Column(name = "INFOWINDOW", length = 1000)
    private String infoWindow;

    @Column(name = "ZOOMLEVEL")
    private Integer zoomLevel;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public RoughMap(String roughMapId, String roughMapSj, String roughMapAddress, String la, String lo, String markerLa,
            String markerLo, String infoWindow, Integer zoomLevel, String frstRegisterId) {
        this.roughMapId = roughMapId;
        this.roughMapSj = roughMapSj;
        this.roughMapAddress = roughMapAddress;
        this.la = la;
        this.lo = lo;
        this.markerLa = markerLa;
        this.markerLo = markerLo;
        this.infoWindow = infoWindow;
        this.zoomLevel = zoomLevel;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String roughMapSj, String roughMapAddress, String la, String lo, String markerLa,
            String markerLo,
            String infoWindow, Integer zoomLevel, String lastUpdusrId) {
        this.roughMapSj = roughMapSj;
        this.roughMapAddress = roughMapAddress;
        this.la = la;
        this.lo = lo;
        this.markerLa = markerLa;
        this.markerLo = markerLo;
        this.infoWindow = infoWindow;
        this.zoomLevel = zoomLevel;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
