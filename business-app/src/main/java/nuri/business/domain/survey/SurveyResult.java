package nuri.business.domain.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 응답 결과 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(
        name = "tb_srvy_rslt",
        // V2_44 의 DB UNIQUE 를 JPA 로 미러링한다(UniqueConstraintMirrorLinterTest 강제).
        // 입도가 (설문, 문항, 항목, 등록자)인 이유: 제출 1회가 답변 수만큼 행을 만들고 그 행들이
        // 전부 같은 srvy_sn·frst_rgtr_id 를 가지므로, 그 둘만으로 UNIQUE 를 걸면 정상 제출이 깨진다.
        // 다중선택은 항목이 달라 통과하고, 완전 동일 행만 차단된다.
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tb_srvy_rslt_answer",
                columnNames = {"srvy_sn", "srvy_qstn_sn", "srvy_artcl_sn", "frst_rgtr_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long srvyRspnsSn;

    @Column(nullable = false)
    private Long srvySn;

    @Column(nullable = false)
    private Long srvyTmpltSn;

    @Column(nullable = false)
    private Long srvyQstnSn;

    @Column(nullable = false)
    private Long srvyArtclSn;

    @Column(length = 4000)
    private String rspdntAnsCn;

    @Column(length = 100)
    private String rspnsNm;

    @Column(length = 4000)
    private String etcAnsCn;

    private SurveyResult(Long srvyRspnsSn, Long srvySn, Long srvyTmpltSn, Long srvyQstnSn,
            Long srvyArtclSn, String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        this.srvyRspnsSn = srvyRspnsSn;
        this.srvySn = srvySn;
        this.srvyTmpltSn = srvyTmpltSn;
        this.srvyQstnSn = srvyQstnSn;
        this.srvyArtclSn = srvyArtclSn;
        this.rspdntAnsCn = rspdntAnsCn;
        this.rspnsNm = rspnsNm;
        this.etcAnsCn = etcAnsCn;
    }

    @Builder
    public static SurveyResult create(Long srvyRspnsSn, Long srvySn, Long srvyTmpltSn, Long srvyQstnSn,
            Long srvyArtclSn, String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        return new SurveyResult(srvyRspnsSn, srvySn, srvyTmpltSn, srvyQstnSn, srvyArtclSn, rspdntAnsCn, rspnsNm, etcAnsCn);
    }

    public void update(String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        this.rspdntAnsCn = rspdntAnsCn;
        this.rspnsNm = rspnsNm;
        this.etcAnsCn = etcAnsCn;
    }
}
