package nuri.business.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 응답자 엔티티
 * 매핑 테이블: NQESTNRRESPOND
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 감사 필드(frstRgtrId)는 표준 Auditing 파이프라인에 위임(호출부 빌더에서 제거).
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_rspdnt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyRespondent extends BaseEntity {

    @Id
    @Column(length = 20)
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

    private SurveyRespondent(String srvyRspdntId, String srvyId, String srvyTmpltId, String gndrCd,
            String crTypeCd, String rspdntNm, String brdt, String rgnTelno, String midTelno, String endTelno) {
        this.srvyRspdntId = srvyRspdntId;
        this.srvyId = srvyId;
        this.srvyTmpltId = srvyTmpltId;
        this.gndrCd = gndrCd;
        this.crTypeCd = crTypeCd;
        this.rspdntNm = rspdntNm;
        this.brdt = brdt;
        this.rgnTelno = rgnTelno;
        this.midTelno = midTelno;
        this.endTelno = endTelno;
    }

    @Builder
    public static SurveyRespondent create(String srvyRspdntId, String srvyId, String srvyTmpltId, String gndrCd,
            String crTypeCd, String rspdntNm, String brdt, String rgnTelno, String midTelno, String endTelno) {
        return new SurveyRespondent(srvyRspdntId, srvyId, srvyTmpltId, gndrCd, crTypeCd, rspdntNm,
                brdt, rgnTelno, midTelno, endTelno);
    }

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
