package nuri.business.domain.help;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 온라인 메뉴얼 Entity
 * 매핑 테이블: TB_ONLN_MNL_INFO
 */
@Entity
@Table(name = "tb_onln_mnl_info")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class OnlineManual extends BaseEntity {

    @Id
    @Column(name = "onln_mnl_id", length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("onlineMnlId")
    private String onlnMnlId;

    @Column(length = 100, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("onlineMnlNm")
    private String onlnMnlNm;

    @Column(length = 12, nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("onlineMnlSeCode")
    private String onlnMnlSeCd;

    @Column(length = 1000)
    @com.fasterxml.jackson.annotation.JsonProperty("onlineMnlDf")
    private String onlnMnlDfn;

    @Column(columnDefinition = "TEXT", length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("onlineMnlDc")
    private String onlnMnlExpln;

    public void update(String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf, String onlineMnlDc) {
        this.onlnMnlNm = onlineMnlNm;
        this.onlnMnlSeCd = onlineMnlSeCode;
        this.onlnMnlDfn = onlineMnlDf;
        this.onlnMnlExpln = onlineMnlDc;
    }

    // ----- [Legacy Aliases & Compatibility Bridge] -----

    public String getOnlineMnlId() {
        return this.onlnMnlId;
    }

    public void setOnlineMnlId(String onlineMnlId) {
        this.onlnMnlId = onlineMnlId;
    }

    public String getOnlineMnlNm() {
        return this.onlnMnlNm;
    }

    public void setOnlineMnlNm(String onlineMnlNm) {
        this.onlnMnlNm = onlineMnlNm;
    }

    public String getOnlineMnlSeCode() {
        return this.onlnMnlSeCd;
    }

    public void setOnlineMnlSeCode(String onlineMnlSeCode) {
        this.onlnMnlSeCd = onlineMnlSeCode;
    }

    public String getOnlineMnlDf() {
        return this.onlnMnlDfn;
    }

    public void setOnlineMnlDf(String onlineMnlDf) {
        this.onlnMnlDfn = onlineMnlDf;
    }

    public String getOnlineMnlDc() {
        return this.onlnMnlExpln;
    }

    public void setOnlineMnlDc(String onlineMnlDc) {
        this.onlnMnlExpln = onlineMnlDc;
    }

    public static abstract class OnlineManualBuilder<C extends OnlineManual, B extends OnlineManualBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String onlnMnlId;
        private String onlnMnlNm;
        private String onlnMnlSeCd;
        private String onlnMnlDfn;
        private String onlnMnlExpln;

        public B onlineMnlId(String onlineMnlId) {
            this.onlnMnlId = onlineMnlId;
            return self();
        }

        public B onlineMnlNm(String onlineMnlNm) {
            this.onlnMnlNm = onlineMnlNm;
            return self();
        }

        public B onlineMnlSeCode(String onlineMnlSeCode) {
            this.onlnMnlSeCd = onlineMnlSeCode;
            return self();
        }

        public B onlineMnlDf(String onlineMnlDf) {
            this.onlnMnlDfn = onlineMnlDf;
            return self();
        }

        public B onlineMnlDc(String onlineMnlDc) {
            this.onlnMnlExpln = onlineMnlDc;
            return self();
        }
    }
}
