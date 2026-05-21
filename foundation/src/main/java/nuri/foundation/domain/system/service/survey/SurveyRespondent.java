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
    @Column(name = "srvy_rspdnt_id", length = 20)
    private String srvyRspdId;

    @Column(name = "srvy_id", length = 20, nullable = false)
    private String srvyId;

    @Column(name = "srvy_tmplt_id", length = 20, nullable = false)
    private String srvyTmplatId;

    @Column(name = "gndr_cd", length = 12)
    private String gndrCd;

    @Column(name = "cr_type_cd", length = 12)
    private String jobTypeCd;

    @Column(name = "rspdnt_nm", length = 100)
    private String rspdNm;

    @Column(name = "brdt", length = 8)
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
