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
    private String srvyRspdntId;

    @Column(length = 20, nullable = false)
    private String srvyId;

    @Column(length = 20, nullable = false)
    private String srvyTmpltId;

    @Column(length = 12)
    private String gndrCd;

    @Column(length = 12)
    private String crTypeCd;

    @Column(length = 100)
    private String rspdntNm;

    @Column(length = 8)
    private String brdt;

    @Column(length = 4)
    private String rgnTelno;

    @Column(length = 4)
    private String midTelno;

    @Column(length = 4)
    private String endTelno;

    public void update(String gndrCd, String crTypeCd, String rspdntNm, String brdt,
            String rgnTelno, String midTelno, String endTelno) {
        this.gndrCd = gndrCd;
        this.crTypeCd = crTypeCd;
        this.rspdntNm = rspdntNm;
        this.brdt = brdt;
        this.rgnTelno = rgnTelno;
        this.midTelno = midTelno;
        this.endTelno = endTelno;
    }
}
