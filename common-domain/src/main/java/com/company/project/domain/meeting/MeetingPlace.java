package com.company.project.domain.meeting;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 회의실관리 JPA Entity
 * 레거시 테이블: COMTNMTGPLACEMANAGE
 */
@Entity
@Table(name = "NMTGPLACEMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingPlace {

    @Id
    @Column(name = "MTG_PLACE_ID", length = 20)
    private String mtgPlaceId;

    @Column(name = "MTG_PLACE_NM", length = 255, nullable = false)
    private String mtgPlaceNm;

    @Column(name = "OPN_BEGIN_TM", length = 6)
    private String opnBeginTm;

    @Column(name = "OPN_END_TM", length = 6)
    private String opnEndTm;

    @Column(name = "ACEPTNC_POSBL_NMPR")
    private Integer aceptncPosblNmpr;

    @Column(name = "LC_SE", length = 2)
    private String lcSe;

    @Column(name = "LC_DETAIL", length = 200)
    private String lcDetail;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGISTER_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MeetingPlace(String mtgPlaceId, String mtgPlaceNm, String opnBeginTm, String opnEndTm,
            Integer aceptncPosblNmpr, String lcSe, String lcDetail, String atchFileId,
            String frstRegisterId) {
        this.mtgPlaceId = mtgPlaceId;
        this.mtgPlaceNm = mtgPlaceNm;
        this.opnBeginTm = opnBeginTm;
        this.opnEndTm = opnEndTm;
        this.aceptncPosblNmpr = aceptncPosblNmpr;
        this.lcSe = lcSe;
        this.lcDetail = lcDetail;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String mtgPlaceNm, String opnBeginTm, String opnEndTm,
            Integer aceptncPosblNmpr, String lcSe, String lcDetail,
            String atchFileId, String updusrId) {
        this.mtgPlaceNm = mtgPlaceNm;
        this.opnBeginTm = opnBeginTm;
        this.opnEndTm = opnEndTm;
        this.aceptncPosblNmpr = aceptncPosblNmpr;
        this.lcSe = lcSe;
        this.lcDetail = lcDetail;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
