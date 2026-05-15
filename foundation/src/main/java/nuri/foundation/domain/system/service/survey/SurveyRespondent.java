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
@Table(name = "TB_SURVEY_RESPONDENT")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class SurveyRespondent extends BaseEntity {

    @Id
    @Column(name = "QUSTNR_RESPOND_ID", length = 20)
    private String srvyRspdId;

    @Column(name = "QESTNR_ID", length = 20, nullable = false)
    private String srvyId;

    @Column(name = "QUSTNR_TMPLAT_ID", length = 20, nullable = false)
    private String srvyTmplatId;

    @Column(name = "SEXDSTN_CODE", length = 1)
    private String gndrCd;

    @Column(name = "OCCP_TY_CODE", length = 1)
    private String jobTypeCd;

    @Column(name = "RESPOND_NM", length = 50)
    private String rspdNm;

    @Column(name = "BRDT", length = 20)
    private String brthYmd;

    @Column(name = "RGN_TELNO", length = 4)
    private String areaTelno;

    @Column(name = "MID_TELNO", length = 4)
    private String midTelno;

    @Column(name = "END_TELNO", length = 4)
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
