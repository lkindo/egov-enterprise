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
@Table(name = "TB_DGSTFN_INFO")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SuperBuilder
public class Satisfaction extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "stsfdgIdSeq")
    @SequenceGenerator(name = "stsfdgIdSeq", sequenceName = "STSFDG_ID_SEQ", allocationSize = 1)
    @Column(name = "STSFDG_ID")
    private Long stsfdgId;

    @Column(name = "BBS_ID", nullable = false)
    private String bbsId;

    @Column(name = "NTT_ID", nullable = false)
    private Long pstId;

    @Column(name = "DGSTFN_SCR", nullable = false)
    private Integer stsfdgLevel;

    @Column(name = "DGSTFN_CN", length = 2500)
    private String stsfdgCn;

    @Column(name = "PSWD", length = 200)
    private String password;

    @Builder.Default
    @Column(name = "USE_YN", length = 1)
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
    public Long getArticleId() { return pstId; }
    public void setArticleId(Long v) { this.pstId = v; }
    public Integer getSatisfactionLevel() { return stsfdgLevel; }
    public void setSatisfactionLevel(Integer v) { this.stsfdgLevel = v; }
}
