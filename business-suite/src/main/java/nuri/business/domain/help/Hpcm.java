package nuri.business.domain.help;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 도움말 정보 Entity
 * 테이블명: TB_HLP_INFO
 */
@Entity
@Table(name = "tb_hlp_info")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Hpcm extends BaseEntity {

    @Id
    @Column(name = "hlp_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("hpcmId")
    private String hlpId;

    @Column(length = 3, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("hpcmSeCode")
    private String hlpSeCd;

    @Column(length = 1000, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("hpcmDf")
    private String hlpDfn;

    @Column(columnDefinition = "TEXT")
    @com.fasterxml.jackson.annotation.JsonProperty("hpcmDc")
    private String hlpExpln;

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc) {
        this.hlpSeCd = hpcmSeCode;
        this.hlpDfn = hpcmDf;
        this.hlpExpln = hpcmDc;
    }

    // ----- [Legacy Aliases & Compatibility Bridge] -----

    public String getHpcmId() {
        return this.hlpId;
    }

    public void setHpcmId(String hpcmId) {
        this.hlpId = hpcmId;
    }

    public String getHpcmSeCode() {
        return this.hlpSeCd;
    }

    public void setHpcmSeCode(String hpcmSeCode) {
        this.hlpSeCd = hpcmSeCode;
    }

    public String getHpcmDf() {
        return this.hlpDfn;
    }

    public void setHpcmDf(String hpcmDf) {
        this.hlpDfn = hpcmDf;
    }

    public String getHpcmDc() {
        return this.hlpExpln;
    }

    public void setHpcmDc(String hpcmDc) {
        this.hlpExpln = hpcmDc;
    }

    public static abstract class HpcmBuilder<C extends Hpcm, B extends HpcmBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String hlpId;
        private String hlpSeCd;
        private String hlpDfn;
        private String hlpExpln;

        public B hpcmId(String hpcmId) {
            this.hlpId = hpcmId;
            return self();
        }

        public B hpcmSeCode(String hpcmSeCode) {
            this.hlpSeCd = hpcmSeCode;
            return self();
        }

        public B hpcmDf(String hpcmDf) {
            this.hlpDfn = hpcmDf;
            return self();
        }

        public B hpcmDc(String hpcmDc) {
            this.hlpExpln = hpcmDc;
            return self();
        }
    }
}
