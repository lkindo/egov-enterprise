package nuri.business.domain.system.service.survey;

import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 템플릿 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_srvy_tmplt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyTemplate extends BaseEntity {

    @Id
    @Column(length = 20)
    private String srvyTmpltId;

    @Column(length = 12)
    private String srvyTmpltTypeCd;

    @Column(length = 4000)
    private String srvyTmpltExpln;

    @Column(length = 100)
    private String srvyTmpltPathNm;

    private byte[] srvyTmpltImgInfo;

    private SurveyTemplate(String srvyTmpltId, String srvyTmpltTypeCd, String srvyTmpltExpln,
            String srvyTmpltPathNm, byte[] srvyTmpltImgInfo) {
        this.srvyTmpltId = srvyTmpltId;
        this.srvyTmpltTypeCd = srvyTmpltTypeCd;
        this.srvyTmpltExpln = srvyTmpltExpln;
        this.srvyTmpltPathNm = srvyTmpltPathNm;
        this.srvyTmpltImgInfo = srvyTmpltImgInfo;
    }

    @Builder
    public static SurveyTemplate create(String srvyTmpltId, String srvyTmpltTypeCd, String srvyTmpltExpln,
            String srvyTmpltPathNm, byte[] srvyTmpltImgInfo) {
        return new SurveyTemplate(srvyTmpltId, srvyTmpltTypeCd, srvyTmpltExpln, srvyTmpltPathNm, srvyTmpltImgInfo);
    }

    public void update(String srvyTmpltTypeCd, String srvyTmpltPathNm, String srvyTmpltExpln) {
        this.srvyTmpltTypeCd = srvyTmpltTypeCd;
        this.srvyTmpltPathNm = srvyTmpltPathNm;
        this.srvyTmpltExpln = srvyTmpltExpln;
    }
}
