package nuri.business.domain.system.service.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 항목 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_srvy_artcl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyArticle extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long srvyArtclSn;

    @Column(nullable = false)
    private Long srvyQstnSn;

    @Column(nullable = false)
    private Long srvySn;

    private Long artclSn;

    @Column(length = 4000)
    private String artclCn;

    @Column(length = 1)
    private String etcAnsYn;

    @Column(nullable = false)
    private Long srvyTmpltSn;

    private SurveyArticle(Long srvyArtclSn, Long srvyQstnSn, Long srvySn, Long artclSn,
            String artclCn, String etcAnsYn, Long srvyTmpltSn) {
        this.srvyArtclSn = srvyArtclSn;
        this.srvyQstnSn = srvyQstnSn;
        this.srvySn = srvySn;
        this.artclSn = artclSn;
        this.artclCn = artclCn;
        this.etcAnsYn = etcAnsYn;
        this.srvyTmpltSn = srvyTmpltSn;
    }

    @Builder
    public static SurveyArticle create(Long srvyArtclSn, Long srvyQstnSn, Long srvySn, Long artclSn,
            String artclCn, String etcAnsYn, Long srvyTmpltSn) {
        return new SurveyArticle(srvyArtclSn, srvyQstnSn, srvySn, artclSn, artclCn, etcAnsYn, srvyTmpltSn);
    }

    public void update(Long artclSn, String artclCn, String etcAnsYn) {
        this.artclSn = artclSn;
        this.artclCn = artclCn;
        this.etcAnsYn = etcAnsYn;
    }
}
