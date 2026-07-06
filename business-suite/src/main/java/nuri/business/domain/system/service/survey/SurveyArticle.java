package nuri.business.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 항목 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_artcl")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyArticle extends BaseEntity {

    @Id
    @Column(length = 20)
    private String srvyArtclId;

    @Column(length = 20)
    private String srvyQstnId;

    @Column(length = 20)
    private String srvyId;

    private Long artclSn;

    @Column(length = 4000)
    private String artclCn;

    @Column(length = 1)
    private String etcAnsYn;

    @Column(length = 20)
    private String srvyTmpltId;

    private SurveyArticle(String srvyArtclId, String srvyQstnId, String srvyId, Long artclSn,
            String artclCn, String etcAnsYn, String srvyTmpltId) {
        this.srvyArtclId = srvyArtclId;
        this.srvyQstnId = srvyQstnId;
        this.srvyId = srvyId;
        this.artclSn = artclSn;
        this.artclCn = artclCn;
        this.etcAnsYn = etcAnsYn;
        this.srvyTmpltId = srvyTmpltId;
    }

    @Builder
    public static SurveyArticle create(String srvyArtclId, String srvyQstnId, String srvyId, Long artclSn,
            String artclCn, String etcAnsYn, String srvyTmpltId) {
        return new SurveyArticle(srvyArtclId, srvyQstnId, srvyId, artclSn, artclCn, etcAnsYn, srvyTmpltId);
    }

    public void update(Long artclSn, String artclCn, String etcAnsYn) {
        this.artclSn = artclSn;
        this.artclCn = artclCn;
        this.etcAnsYn = etcAnsYn;
    }
}
