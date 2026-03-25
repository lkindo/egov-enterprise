package com.company.project.business.domain.roughmap;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 약도 정보 Entity
 * 매핑 테이블: NROUGHMAP
 */
@Entity
@Table(name = "NROUGHMAP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class RoughMap extends BaseEntity {

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

    public void update(String roughMapSj, String roughMapAddress, String la, String lo,
                      String markerLa, String markerLo, String infoWindow, String zoomLevel) {
        this.roughMapSj = roughMapSj;
        this.roughMapAddress = roughMapAddress;
        this.la = la;
        this.lo = lo;
        this.markerLa = markerLa;
        this.markerLo = markerLo;
        this.infoWindow = infoWindow;
        this.zoomLevel = zoomLevel;
    }
}
