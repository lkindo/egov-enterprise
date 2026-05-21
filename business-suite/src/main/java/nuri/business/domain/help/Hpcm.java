package nuri.business.domain.help;

import nuri.foundation.domain.common.BaseEntity;
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
    private String hpcmId;

    @Column(name = "hlp_se_cd", length = 3, nullable = false)
    private String hpcmSeCode;

    @Column(name = "hlp_dfn", length = 1000, nullable = false)
    private String hpcmDf;

    @Column(name = "hlp_expln", columnDefinition = "TEXT")
    private String hpcmDc;

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc) {
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
    }
}
