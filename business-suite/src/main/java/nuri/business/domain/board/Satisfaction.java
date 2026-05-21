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
    private Long stsfdgId;

    @Column(name = "bbs_id", nullable = false, length = 20)
    private String bbsId;

    @Column(name = "ntt_id", nullable = false, length = 20)
    private String pstId;

    @Column(name = "dgstfn_scr", nullable = false)
    private Integer stsfdgLevel;

    @Column(name = "dgstfn_cn", length = 4000)
    private String stsfdgCn;

    @Column(name = "pswd", length = 200)
    private String password;

    @Builder.Default
    @Column(name = "use_yn", length = 1)
    private String useYn = "Y";

    public void update(Integer stsfdgLevel, String stsfdgCn, String password) {
        this.stsfdgLevel = stsfdgLevel;
        this.stsfdgCn = stsfdgCn;
        if (password != null && !password.isEmpty()) {
            this.password = password;
        }
    }

    public void delete() {
        this.useYn = "N";
    }
    
    // legacy
    public String getBoardId() { return bbsId; }
    public void setBoardId(String v) { this.bbsId = v; }
    public String getArticleId() { return pstId; }
    public void setArticleId(String v) { this.pstId = v; }
    public Integer getSatisfactionLevel() { return stsfdgLevel; }
    public void setSatisfactionLevel(Integer v) { this.stsfdgLevel = v; }
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }
}
