package nuri.business.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

/**
 * 만족도 조사 엔티티 (v5 standardized)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_DGSTFN_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Satisfaction extends BaseEntity {

    @Id
    @Column(name = "STSFDG_NO")
    private Long id;

    @Column(name = "NTT_ID", nullable = false)
    private Long pstId;

    @Column(name = "BBS_ID", length = 20, nullable = false)
    private String bbsId;

    @Column(name = "WRTER_ID", length = 20)
    private String writerId;

    @Column(name = "WRTER_NM", length = 20)
    private String writerNm;

    @Column(name = "PASSWORD", length = 200)
    private String password;

    @Column(name = "DGSTFN_SCR", nullable = false)
    private Integer stsfdgLevel;

    @Column(name = "STSFDG_CN", length = 2500)
    private String stsfdgCn;

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
}
