package nuri.business.domain.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 설문 템플릿 엔티티 (물리 DB 명세 100% 일치)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_srvy_tmplt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long srvyTmpltSn;

    @Column(length = 12)
    private String srvyTmpltTypeCd;

    @Column(length = 4000)
    private String srvyTmpltExpln;

    @Column(length = 100)
    private String srvyTmpltPathNm;

    private byte[] srvyTmpltImgInfo;

    private SurveyTemplate(Long srvyTmpltSn, String srvyTmpltTypeCd, String srvyTmpltExpln,
            String srvyTmpltPathNm, byte[] srvyTmpltImgInfo) {
        this.srvyTmpltSn = srvyTmpltSn;
        this.srvyTmpltTypeCd = srvyTmpltTypeCd;
        this.srvyTmpltExpln = srvyTmpltExpln;
        this.srvyTmpltPathNm = srvyTmpltPathNm;
        this.srvyTmpltImgInfo = srvyTmpltImgInfo;
    }

    @Builder
    public static SurveyTemplate create(Long srvyTmpltSn, String srvyTmpltTypeCd, String srvyTmpltExpln,
            String srvyTmpltPathNm, byte[] srvyTmpltImgInfo) {
        return new SurveyTemplate(srvyTmpltSn, srvyTmpltTypeCd, srvyTmpltExpln, srvyTmpltPathNm, srvyTmpltImgInfo);
    }

    public void update(String srvyTmpltTypeCd, String srvyTmpltPathNm, String srvyTmpltExpln) {
        this.srvyTmpltTypeCd = srvyTmpltTypeCd;
        this.srvyTmpltPathNm = srvyTmpltPathNm;
        this.srvyTmpltExpln = srvyTmpltExpln;
    }
}
