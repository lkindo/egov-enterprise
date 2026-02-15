package com.company.project.domain.notification;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Entity(name = "NotificationRoughMap")
@Table(name = "NROUGHMAP")
public class RoughMap extends BaseEntity {

    @Id
    @Column(name = "ROUGHMAP_ID", length = 75)
    private String roughMapId;

    @Column(name = "ROUGHMAPSJ", length = 75)
    private String roughMapSj;

    @Column(name = "ROUGHMAPADDRESS", length = 200)
    private String roughMapAddress;

    @Column(name = "LA", length = 48)
    private String la;

    @Column(name = "LO", length = 48)
    private String lo;

    @Column(name = "MARKERLA", length = 48)
    private String markerLa;

    @Column(name = "MARKERLO", length = 48)
    private String markerLo;

    @Column(name = "ZOOMLEVEL", length = 10)
    private String zoomLevel;

    @Column(name = "INFOWINDOW", length = 20)
    private String infoWindow;

    public void update(String roughMapSj, String roughMapAddress, String la, String lo,
            String markerLa, String markerLo, String zoomLevel, Integer infoWindow, String userId) {
        this.roughMapSj = roughMapSj;
        this.roughMapAddress = roughMapAddress;
        this.la = la;
        this.lo = lo;
        this.markerLa = markerLa;
        this.markerLo = markerLo;
        this.zoomLevel = zoomLevel;
        this.infoWindow = infoWindow != null ? infoWindow.toString() : null;
        this.lastModifiedBy = userId;
    }
}
