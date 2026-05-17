package nuri.business.domain.help;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 온라인 메뉴얼 Entity
 * 매핑 테이블: TB_ONLN_MNL_INFO
 */
@Entity
@Table(name = "TB_ONLN_MNL_INFO")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class OnlineManual extends BaseEntity {

    @Id
    @Column(name = "ONLN_MNL_ID", length = 20)
    private String onlineMnlId;

    @Column(name = "ONLN_MNL_NM", length = 255, nullable = false)
    private String onlineMnlNm;

    @Column(name = "ONLN_MNL_SE_CD", length = 3, nullable = false)
    private String onlineMnlSeCode;

    @Column(name = "ONLN_MNL_DFN", length = 1000)
    private String onlineMnlDf;

    @Column(name = "ONLN_MNL_EXPLN", columnDefinition = "TEXT")
    private String onlineMnlDc;

    public void update(String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf, String onlineMnlDc) {
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
    }

    // legacy getters for compatibility
    public String getOnlineMnlId() { return onlineMnlId; }
}
