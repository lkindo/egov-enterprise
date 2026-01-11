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
@Table(name = "NMTGPLACEMANAGE")
public class MtgPlace {

    @Id
    @Column(name = "MTGRUM_ID", length = 20)
    private String mtgrumId;

    @Column(name = "MTGRUM_NM", length = 255)
    private String mtgrumNm;

    @Column(name = "OPN_BEGIN_TM", length = 4)
    private String opnBeginTm;

    @Column(name = "OPN_END_TM", length = 4)
    private String opnEndTm;

    @Column(name = "ACEPTNC_POSBL_NMPR")
    private Integer aceptncPosblNmpr;

    @Column(name = "LC_SE", length = 3)
    private String lcSe;

    @Column(name = "LC_DETAIL", length = 1000)
    private String lcDetail;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MtgPlace(String mtgrumId, String mtgrumNm, String opnBeginTm, String opnEndTm, Integer aceptncPosblNmpr,
            String lcSe, String lcDetail, String atchFileId, String frstRegisterId) {
        this.mtgrumId = mtgrumId;
        this.mtgrumNm = mtgrumNm;
        this.opnBeginTm = opnBeginTm;
        this.opnEndTm = opnEndTm;
        this.aceptncPosblNmpr = aceptncPosblNmpr;
        this.lcSe = lcSe;
        this.lcDetail = lcDetail;
        this.atchFileId = atchFileId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String mtgrumNm, String opnBeginTm, String opnEndTm, Integer aceptncPosblNmpr,
            String lcSe, String lcDetail, String atchFileId, String lastUpdusrId) {
        this.mtgrumNm = mtgrumNm;
        this.opnBeginTm = opnBeginTm;
        this.opnEndTm = opnEndTm;
        this.aceptncPosblNmpr = aceptncPosblNmpr;
        this.lcSe = lcSe;
        this.lcDetail = lcDetail;
        this.atchFileId = atchFileId;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
