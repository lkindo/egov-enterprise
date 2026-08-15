package nuri.business.domain.system.service.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문조사 정보 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_srvy_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyInfo extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long srvySn;

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

    @Column(nullable = false)
    private Long srvyTmpltSn;

    private SurveyInfo(Long srvySn, String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, Long srvyTmpltSn) {
        this.srvySn = srvySn;
        this.srvyTtl = srvyTtl;
        this.srvyPrps = srvyPrps;
        this.srvyWrtGdCn = srvyWrtGdCn;
        this.srvyBgngYmd = srvyBgngYmd;
        this.srvyEndYmd = srvyEndYmd;
        this.srvyTrgt = srvyTrgt;
        this.srvyTmpltSn = srvyTmpltSn;
    }

    @Builder
    public static SurveyInfo create(Long srvySn, String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, Long srvyTmpltSn) {
        return new SurveyInfo(srvySn, srvyTtl, srvyPrps, srvyWrtGdCn, srvyBgngYmd, srvyEndYmd, srvyTrgt, srvyTmpltSn);
    }

    public void update(String srvyTtl, String srvyPrps, String srvyWrtGdCn,
            String srvyBgngYmd, String srvyEndYmd, String srvyTrgt, Long srvyTmpltSn) {
        this.srvyTtl = srvyTtl;
        this.srvyPrps = srvyPrps;
        this.srvyWrtGdCn = srvyWrtGdCn;
        this.srvyBgngYmd = srvyBgngYmd;
        this.srvyEndYmd = srvyEndYmd;
        this.srvyTrgt = srvyTrgt;
        this.srvyTmpltSn = srvyTmpltSn;
    }
}
