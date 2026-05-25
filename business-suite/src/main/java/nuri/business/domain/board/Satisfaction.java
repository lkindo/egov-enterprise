package nuri.business.domain.board;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_dgstfn_info")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SuperBuilder
public class Satisfaction extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "stsfdgIdSeq")
    @SequenceGenerator(name = "stsfdgIdSeq", sequenceName = "sq_dgstfn_sn", allocationSize = 1)
    @Column(name = "dgstfn_sn")
    @com.fasterxml.jackson.annotation.JsonProperty("stsfdgId")
    private Long dgstfnSn;

    @Column(nullable = false, length = 20)
    private String bbsId;

    @Column(nullable = false, length = 20)
    @com.fasterxml.jackson.annotation.JsonProperty("pstId")
    private String nttId;

    @Column(nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("stsfdgLevel")
    private Integer dgstfnScr;

    @Column(length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("stsfdgCn")
    private String dgstfnCn;

    @Column(length = 200)
    @com.fasterxml.jackson.annotation.JsonProperty("password")
    private String pswd;

    @Builder.Default
    @Column(length = 1)
    private String useYn = "Y";

    @Column(length = 20)
    private String userId;

    @Column(length = 100)
    private String userNm;

    public void update(Integer stsfdgLevel, String stsfdgCn, String password) {
        this.dgstfnScr = stsfdgLevel;
        this.dgstfnCn = stsfdgCn;
        if (password != null && !password.isEmpty()) {
            this.pswd = password;
        }
    }

    public void delete() {
        this.useYn = "N";
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public Long getStsfdgId() { return this.dgstfnSn; }
    public void setStsfdgId(Long v) { this.dgstfnSn = v; }

    public String getPstId() { return this.nttId; }
    public void setPstId(String v) { this.nttId = v; }

    public Integer getStsfdgLevel() { return this.dgstfnScr; }
    public void setStsfdgLevel(Integer v) { this.dgstfnScr = v; }

    public String getStsfdgCn() { return this.dgstfnCn; }
    public void setStsfdgCn(String v) { this.dgstfnCn = v; }

    public String getPassword() { return this.pswd; }
    public void setPassword(String v) { this.pswd = v; }

    public String getBoardId() { return bbsId; }
    public void setBoardId(String v) { this.bbsId = v; }

    public String getArticleId() { return nttId; }
    public void setArticleId(String v) { this.nttId = v; }

    public Integer getSatisfactionLevel() { return dgstfnScr; }
    public void setSatisfactionLevel(Integer v) { this.dgstfnScr = v; }

    public String getNttId() { return nttId; }
    public void setNttId(String v) { this.nttId = v; }

    // legacy aliases for frontend compatibility
    public String getWrterId() { return userId; }
    public void setWrterId(String v) { this.userId = v; }
    public String getWrterNm() { return userNm; }
    public void setWrterNm(String v) { this.userNm = v; }

    public static abstract class SatisfactionBuilder<C extends Satisfaction, B extends SatisfactionBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private Long dgstfnSn;
        private String nttId;
        private Integer dgstfnScr;
        private String dgstfnCn;
        private String pswd;

        public B stsfdgId(Long stsfdgId) {
            this.dgstfnSn = stsfdgId;
            return self();
        }
        public B pstId(String pstId) {
            this.nttId = pstId;
            return self();
        }
        public B stsfdgLevel(Integer stsfdgLevel) {
            this.dgstfnScr = stsfdgLevel;
            return self();
        }
        public B stsfdgCn(String stsfdgCn) {
            this.dgstfnCn = stsfdgCn;
            return self();
        }
        public B password(String password) {
            this.pswd = password;
            return self();
        }
        public B nttId(String nttId) {
            this.nttId = nttId;
            return self();
        }
        public B wrterId(String wrterId) {
            return this.userId(wrterId);
        }
        public B wrterNm(String wrterNm) {
            return this.userNm(wrterNm);
        }
    }
}
