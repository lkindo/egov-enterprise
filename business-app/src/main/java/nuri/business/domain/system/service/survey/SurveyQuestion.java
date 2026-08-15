package nuri.business.domain.system.service.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 문항 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_srvy_qstn")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyQuestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long srvyQstnSn;

    @Column(nullable = false)
    private Long srvySn;

    private Long qstnSn;

    @Column(length = 12)
    private String qstnTypeCd;

    @Column(length = 4000)
    private String qstnCn;

    private Integer maxChcCnt;

    @Column(nullable = false)
    private Long srvyTmpltSn;

    private SurveyQuestion(Long srvyQstnSn, Long srvySn, Long qstnSn, String qstnTypeCd,
            String qstnCn, Integer maxChcCnt, Long srvyTmpltSn) {
        this.srvyQstnSn = srvyQstnSn;
        this.srvySn = srvySn;
        this.qstnSn = qstnSn;
        this.qstnTypeCd = qstnTypeCd;
        this.qstnCn = qstnCn;
        this.maxChcCnt = maxChcCnt;
        this.srvyTmpltSn = srvyTmpltSn;
    }

    @Builder
    public static SurveyQuestion create(Long srvyQstnSn, Long srvySn, Long qstnSn, String qstnTypeCd,
            String qstnCn, Integer maxChcCnt, Long srvyTmpltSn) {
        return new SurveyQuestion(srvyQstnSn, srvySn, qstnSn, qstnTypeCd, qstnCn, maxChcCnt, srvyTmpltSn);
    }

    public void update(Long qstnSn, String qstnTypeCd, String qstnCn, Integer maxChcCnt) {
        this.qstnSn = qstnSn;
        this.qstnTypeCd = qstnTypeCd;
        this.qstnCn = qstnCn;
        this.maxChcCnt = maxChcCnt;
    }
}
