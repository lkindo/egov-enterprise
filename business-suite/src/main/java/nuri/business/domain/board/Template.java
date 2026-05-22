package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity(name = "BoardTemplate")
@Table(name = "tb_tmplt_info")
public class Template extends BaseEntity {

    @Id
    @Column(name = "tmplt_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("tmplatId")
    private String tmpltId;

    @Column(name = "tmplt_nm", nullable = false, length = 100)
    @com.fasterxml.jackson.annotation.JsonProperty("tmplatNm")
    private String tmpltNm;

    @Column(name = "tmplt_path", nullable = false, length = 1000)
    @com.fasterxml.jackson.annotation.JsonProperty("tmplatCours")
    private String tmpltPath;

    @Column(name = "use_yn", nullable = false, length = 1)
    @Builder.Default
    private String useYn = "Y";

    @Column(name = "tmplt_se_cd", length = 12, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("tmplatSeCode")
    private String tmpltSeCd;

    public void update(String tmplatNm, String tmplatCours, String useYn, String tmplatSeCode) {
        this.tmpltNm = tmplatNm;
        this.tmpltPath = tmplatCours;
        this.useYn = useYn;
        this.tmpltSeCd = tmplatSeCode;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public String getTmplatId() { return this.tmpltId; }
    public void setTmplatId(String v) { this.tmpltId = v; }

    public String getTmplatNm() { return this.tmpltNm; }
    public void setTmplatNm(String v) { this.tmpltNm = v; }

    public String getTmplatCours() { return this.tmpltPath; }
    public void setTmplatCours(String v) { this.tmpltPath = v; }

    public String getTmplatSeCode() { return this.tmpltSeCd; }
    public void setTmplatSeCode(String v) { this.tmpltSeCd = v; }

    public static abstract class TemplateBuilder<C extends Template, B extends TemplateBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String tmpltId;
        private String tmpltNm;
        private String tmpltPath;
        private String tmpltSeCd;

        public B tmplatId(String tmplatId) {
            this.tmpltId = tmplatId;
            return self();
        }
        public B tmplatNm(String tmplatNm) {
            this.tmpltNm = tmplatNm;
            return self();
        }
        public B tmplatCours(String tmplatCours) {
            this.tmpltPath = tmplatCours;
            return self();
        }
        public B tmplatSeCode(String tmplatSeCode) {
            this.tmpltSeCd = tmplatSeCode;
            return self();
        }
    }
}
