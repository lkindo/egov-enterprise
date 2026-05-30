package nuri.business.domain.template;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 템플릿 정보 엔티티
 * 매핑 테이블: NTMPLATINFO
 */
@Entity
@Table(name = "tb_tmplt_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Template extends BaseEntity {

    @Id
    @Column(name = "tmplt_id", length = 20)
    private String tmpltId;

    @Column(name = "tmplt_nm", length = 100, nullable = false)
    private String tmpltNm;

    @Column(name = "tmplt_se_cd", length = 12, nullable = false)
    private String tmpltSeCd;

    @Column(name = "tmplt_path", length = 1000)
    private String tmpltPath;

    @Column(name = "use_yn", length = 1)
    private String useYn;

    // ----- [Legacy Getter Aliases] -----

    public String getTmplatId() { return this.tmpltId; }
    public String getTmplatNm() { return this.tmpltNm; }
    public String getTmplatSeCode() { return this.tmpltSeCd; }
    public String getTmplatCours() { return this.tmpltPath; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----

    public static abstract class TemplateBuilder<C extends Template, B extends TemplateBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B tmplatId(String tmplatId) {
            this.tmpltId = tmplatId;
            return self();
        }
        public B tmplatNm(String tmplatNm) {
            this.tmpltNm = tmplatNm;
            return self();
        }
        public B tmplatSeCode(String tmplatSeCode) {
            this.tmpltSeCd = tmplatSeCode;
            return self();
        }
        public B tmplatCours(String tmplatCours) {
            this.tmpltPath = tmplatCours;
            return self();
        }
    }

    public void update(String tmplatNm, String tmplatSeCode, String tmplatCours, String useYn) {
        this.tmpltNm = tmplatNm;
        this.tmpltSeCd = tmplatSeCode;
        this.tmpltPath = tmplatCours;
        this.useYn = useYn;
    }
}
