package nuri.business.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문조사 정보 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyInfo extends BaseEntity {

    @Id
    @Column(length = 20)
    private String srvyId;

    @Column(length = 100, nullable = false)
    private String srvyTtl;

    @Column(length = 1000)
    private String srvyPrps;

    @Column(length = 4000)
    private String srvyWrtGdCn;

    @Column(length = 8)
    private String srvyBgngYmd;

    @Column(length = 8)
    private String srvyEndYmd;

    @Column(length = 1000)
    private String srvyTrgt;

    @Column(length = 20, nullable = false)
    private String srvyTmpltId;

    private SurveyInfo(String srvyId, String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, String srvyTmpltId) {
        this.srvyId = srvyId;
        this.srvyTtl = srvyTtl;
        this.srvyPrps = srvyPrps;
        this.srvyWrtGdCn = srvyWrtGdCn;
        this.srvyBgngYmd = srvyBgngYmd;
        this.srvyEndYmd = srvyEndYmd;
        this.srvyTrgt = srvyTrgt;
        this.srvyTmpltId = srvyTmpltId;
    }

    @Builder
    public static SurveyInfo create(String srvyId, String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, String srvyTmpltId) {
        return new SurveyInfo(srvyId, srvyTtl, srvyPrps, srvyWrtGdCn, srvyBgngYmd, srvyEndYmd, srvyTrgt, srvyTmpltId);
    }

    public void update(String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, String srvyTmpltId) {
        this.srvyTtl = srvyTtl;
        this.srvyPrps = srvyPrps;
        this.srvyWrtGdCn = srvyWrtGdCn;
        this.srvyBgngYmd = srvyBgngYmd;
        this.srvyEndYmd = srvyEndYmd;
        this.srvyTrgt = srvyTrgt;
        this.srvyTmpltId = srvyTmpltId;
    }
}
