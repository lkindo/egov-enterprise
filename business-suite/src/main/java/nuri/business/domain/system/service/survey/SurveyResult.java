package nuri.business.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 응답 결과 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_rslt")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyResult extends BaseEntity {

    @Id
    @Column(length = 20)
    private String srvyRspnsId;

    @Column(length = 20, nullable = false)
    private String srvyId;

    @Column(length = 20, nullable = false)
    private String srvyTmpltId;

    @Column(length = 20, nullable = false)
    private String srvyQstnId;

    @Column(length = 20, nullable = false)
    private String srvyArtclId;

    @Column(length = 4000)
    private String rspdntAnsCn;

    @Column(length = 100)
    private String rspnsNm;

    @Column(length = 4000)
    private String etcAnsCn;

    private SurveyResult(String srvyRspnsId, String srvyId, String srvyTmpltId, String srvyQstnId,
            String srvyArtclId, String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        this.srvyRspnsId = srvyRspnsId;
        this.srvyId = srvyId;
        this.srvyTmpltId = srvyTmpltId;
        this.srvyQstnId = srvyQstnId;
        this.srvyArtclId = srvyArtclId;
        this.rspdntAnsCn = rspdntAnsCn;
        this.rspnsNm = rspnsNm;
        this.etcAnsCn = etcAnsCn;
    }

    @Builder
    public static SurveyResult create(String srvyRspnsId, String srvyId, String srvyTmpltId, String srvyQstnId,
            String srvyArtclId, String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        return new SurveyResult(srvyRspnsId, srvyId, srvyTmpltId, srvyQstnId, srvyArtclId, rspdntAnsCn, rspnsNm, etcAnsCn);
    }

    public void update(String rspdntAnsCn, String rspnsNm, String etcAnsCn) {
        this.rspdntAnsCn = rspdntAnsCn;
        this.rspnsNm = rspnsNm;
        this.etcAnsCn = etcAnsCn;
    }
}
