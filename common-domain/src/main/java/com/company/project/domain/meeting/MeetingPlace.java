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
 * ???벥?????JPA Entity
 * ??뉕탢?????뵠?? NMTGPLACEMANAGE
 */
@Entity
@Table(name = "NMTGPLACEMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MeetingPlace extends BaseEntity {

    @Id
    @Column(name = "MTGRUM_ID", length = 20)
    private String mtgPlaceId;

    @Column(name = "MTGRUM_NM", length = 255, nullable = false)
    private String mtgPlaceNm;

    @Column(name = "OPN_BEGIN_TM", length = 10)
    private String opnBeginTm;

    @Column(name = "OPN_END_TM", length = 10)
    private String opnEndTm;

    @Column(name = "ACEPTNC_POSBL_NMPR")
    private Integer aceptncPosblNmpr;

    @Column(name = "LC_SE", length = 10)
    private String lcSe;

    @Column(name = "LC_DETAIL", length = 255)
    private String lcDetail;

    @Column(name = "ATCH_FILE_ID", length = 20)
    private String atchFileId;

    @Builder
    public MeetingPlace(String mtgPlaceId, String mtgPlaceNm, String opnBeginTm, String opnEndTm,
            Integer aceptncPosblNmpr, String lcSe, String lcDetail, String atchFileId) {
        this.mtgPlaceId = mtgPlaceId;
        this.mtgPlaceNm = mtgPlaceNm;
        this.opnBeginTm = opnBeginTm;
        this.opnEndTm = opnEndTm;
        this.aceptncPosblNmpr = aceptncPosblNmpr;
        this.lcSe = lcSe;
        this.lcDetail = lcDetail;
        this.atchFileId = atchFileId;
    }

    public void update(String mtgPlaceNm, String opnBeginTm, String opnEndTm,
            Integer aceptncPosblNmpr, String lcSe, String lcDetail,
            String atchFileId) {
        this.mtgPlaceNm = mtgPlaceNm;
        this.opnBeginTm = opnBeginTm;
        this.opnEndTm = opnEndTm;
        this.aceptncPosblNmpr = aceptncPosblNmpr;
        this.lcSe = lcSe;
        this.lcDetail = lcDetail;
        this.atchFileId = atchFileId;
    }
}