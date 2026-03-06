package com.company.project.domain.meeting;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ???벥??쇱굙??JPA Entity
 * ??뉕탢?????뵠?? NMTGPLACERESVE
 */
@Entity
@Table(name = "NMTGPLACERESVE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingReservation extends BaseEntity {

    @Id
    @Column(name = "RESVE_ID", length = 20)
    private String resveId;

    @Column(name = "MTGRUM_ID", length = 20, nullable = false)
    private String mtgPlaceId;

    @Column(name = "MTG_SJ", length = 255, nullable = false)
    private String mtgSj;

    @Column(name = "RSVCTM_ID", length = 20, nullable = false)
    private String resveManId;

    @Column(name = "RESVE_DE", length = 10, nullable = false)
    private String resveDe;

    @Column(name = "RESVE_BEGIN_TM", length = 10, nullable = false)
    private String resveBeginTm;

    @Column(name = "RESVE_END_TM", length = 10, nullable = false)
    private String resveEndTm;

    @Column(name = "ATNDNC_NMPR")
    private Integer atndncNmpr;

    @Column(name = "MTG_CN", columnDefinition = "TEXT")
    private String mtgCn;

    @Builder
    public MeetingReservation(String resveId, String mtgPlaceId, String mtgSj, String resveManId,
            String resveDe, String resveBeginTm, String resveEndTm,
            Integer atndncNmpr, String mtgCn) {
        this.resveId = resveId;
        this.mtgPlaceId = mtgPlaceId;
        this.mtgSj = mtgSj;
        this.resveManId = resveManId;
        this.resveDe = resveDe;
        this.resveBeginTm = resveBeginTm;
        this.resveEndTm = resveEndTm;
        this.atndncNmpr = atndncNmpr;
        this.mtgCn = mtgCn;
    }

    public void update(String mtgPlaceId, String mtgSj, String resveDe,
            String resveBeginTm, String resveEndTm, Integer atndncNmpr,
            String mtgCn) {
        this.mtgPlaceId = mtgPlaceId;
        this.mtgSj = mtgSj;
        this.resveDe = resveDe;
        this.resveBeginTm = resveBeginTm;
        this.resveEndTm = resveEndTm;
        this.atndncNmpr = atndncNmpr;
        this.mtgCn = mtgCn;
    }
}
