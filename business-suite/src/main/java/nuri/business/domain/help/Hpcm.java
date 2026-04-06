package nuri.business.domain.help;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 도움말 정보 Entity
 * 테이블명: NHPCMINFO
 */
@Entity
@Table(name = "NHPCMINFO")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Hpcm extends BaseEntity {

    @Id
    @Column(name = "HPCM_ID", length = 20)
    private String hpcmId;

    @Column(name = "HPCM_SE_CODE", length = 3, nullable = false)
    private String hpcmSeCode;

    @Column(name = "HPCM_DFN", length = 1000, nullable = false)
    private String hpcmDf;

    @Column(name = "HPCM_DC", columnDefinition = "TEXT")
    private String hpcmDc;

    public void update(String hpcmSeCode, String hpcmDf, String hpcmDc) {
        this.hpcmSeCode = hpcmSeCode;
        this.hpcmDf = hpcmDf;
        this.hpcmDc = hpcmDc;
    }
}
