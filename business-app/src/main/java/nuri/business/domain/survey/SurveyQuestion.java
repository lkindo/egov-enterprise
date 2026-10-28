package nuri.business.domain.survey;

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

    /**
     * 주관식 문항 유형. 응답 결과의 항목 컬럼이 NOT NULL 이라 주관식도 답변 칸 하나(항목)를 갖고, 응답자는 그 칸에 글로 답한다
     * ({@code rspdnt_ans_cn}). 그 밖의 유형은 선택형으로 다룬다(종전과 같다).
     */
    public static final String TYPE_FREE_TEXT = "2";

    /** 주관식 답변 칸의 기본 문구 — 통계·응답 목록에서 그 문항의 답이 모이는 칸의 이름이다. */
    public static final String FREE_TEXT_ARTICLE_CONTENT = "자유 응답";

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

    public boolean isFreeText() {
        return TYPE_FREE_TEXT.equals(qstnTypeCd);
    }

    public void update(Long qstnSn, String qstnTypeCd, String qstnCn, Integer maxChcCnt) {
        this.qstnSn = qstnSn;
        this.qstnTypeCd = qstnTypeCd;
        this.qstnCn = qstnCn;
        this.maxChcCnt = maxChcCnt;
    }
}
