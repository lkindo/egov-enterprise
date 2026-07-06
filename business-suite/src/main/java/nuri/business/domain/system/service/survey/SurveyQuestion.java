package nuri.business.domain.system.service.survey;

import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 20)
    private String srvyQstnId;

    @Column(length = 20)
    private String srvyId;

    private Long qstnSn;

    @Column(length = 12)
    private String qstnTypeCd;

    @Column(length = 4000)
    private String qstnCn;

    private Integer maxChcCnt;

    @Column(length = 20)
    private String srvyTmpltId;

    private SurveyQuestion(String srvyQstnId, String srvyId, Long qstnSn, String qstnTypeCd,
            String qstnCn, Integer maxChcCnt, String srvyTmpltId) {
        this.srvyQstnId = srvyQstnId;
        this.srvyId = srvyId;
        this.qstnSn = qstnSn;
        this.qstnTypeCd = qstnTypeCd;
        this.qstnCn = qstnCn;
        this.maxChcCnt = maxChcCnt;
        this.srvyTmpltId = srvyTmpltId;
    }

    @Builder
    public static SurveyQuestion create(String srvyQstnId, String srvyId, Long qstnSn, String qstnTypeCd,
            String qstnCn, Integer maxChcCnt, String srvyTmpltId) {
        return new SurveyQuestion(srvyQstnId, srvyId, qstnSn, qstnTypeCd, qstnCn, maxChcCnt, srvyTmpltId);
    }

    public void update(Long qstnSn, String qstnTypeCd, String qstnCn, Integer maxChcCnt) {
        this.qstnSn = qstnSn;
        this.qstnTypeCd = qstnTypeCd;
        this.qstnCn = qstnCn;
        this.maxChcCnt = maxChcCnt;
    }
}
