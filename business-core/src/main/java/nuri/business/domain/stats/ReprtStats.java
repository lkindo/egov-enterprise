package nuri.business.domain.stats;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 보고서 통계 JPA Entity
 * [Audit] BaseEntity 상속을 통해 표준 감사 필드 사용
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_rptp_stats")
public class ReprtStats extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long rptpSn;

    // 물리 컬럼은 표준 용어(보고서명=RPTP_NM, V2_19)로 리네임 — Java 필드/JSON 계약은 유지
    @Column(name = "rptp_nm", length = 256)
    private String reprtNm;

    @Column(length = 1)
    private String reprtSttus;

    @Column(length = 1)
    private String reprtType;

    private ReprtStats(String reprtNm, String reprtSttus, String reprtType) {
        this.reprtNm = reprtNm;
        this.reprtSttus = reprtSttus;
        this.reprtType = reprtType;
    }

    @Builder
    public static ReprtStats create(String reprtNm, String reprtSttus, String reprtType) {
        return new ReprtStats(reprtNm, reprtSttus, reprtType);
    }
}
