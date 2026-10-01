package nuri.business.domain.survey;

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

    @Column(length = 256, nullable = false)
    private String srvyTtl;

    @Column(length = 4000)
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

    /**
     * [2026-10-01 결정 21] 공개 여부(rls_yn). 'N' 은 작성 중이라 응답자에게 보이지 않고, 'Y' 여야 목록·응답이 열린다.
     * 새 설문은 작성 중으로 시작한다. V2_117 이전 설문은 공개로 옮겼다.
     */
    @Column(length = 1, nullable = false)
    private String rlsYn = "N";

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

    /** [2026-10-01 결정 21] 공개하거나 작성 중으로 되돌린다. */
    public void changeRelease(boolean released) {
        this.rlsYn = released ? "Y" : "N";
    }

    public boolean isReleased() {
        return "Y".equals(rlsYn);
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
