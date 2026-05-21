package nuri.foundation.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 설문 응답자 엔티티
 * 매핑 테이블: NQESTNRRESPOND
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_rspdnt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyRespondent extends BaseEntity {

    @Id
    @Column(name = "qustnr_respond_id", length = 20)
    private String srvyRspdId;

    @Column(name = "qestnr_id", length = 20, nullable = false)
    private String srvyId;

    @Column(name = "qustnr_tmplat_id", length = 20, nullable = false)
    private String srvyTmplatId;

    @Column(name = "sexdstn_code", length = 1)
    private String gndrCd;

    @Column(name = "occp_ty_code", length = 1)
    private String jobTypeCd;

    @Column(name = "respond_nm", length = 50)
    private String rspdNm;

    @Column(name = "brdt", length = 20)
    private String brthYmd;

    @Column(name = "rgn_telno", length = 4)
    private String areaTelno;

    @Column(name = "mid_telno", length = 4)
    private String midTelno;

    @Column(name = "end_telno", length = 4)
    private String endTelno;

    public void update(String gndrCd, String jobTypeCd, String rspdNm, String brthYmd,
            String areaTelno, String midTelno, String endTelno) {
        this.gndrCd = gndrCd;
        this.jobTypeCd = jobTypeCd;
        this.rspdNm = rspdNm;
        this.brthYmd = brthYmd;
        this.areaTelno = areaTelno;
        this.midTelno = midTelno;
        this.endTelno = endTelno;
    }
}
