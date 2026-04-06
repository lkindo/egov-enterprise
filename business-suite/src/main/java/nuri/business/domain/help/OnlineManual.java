package nuri.business.domain.help;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 온라인 메뉴얼 Entity
 * 매핑 테이블: NONLINEMNUAL
 */
@Entity
@Table(name = "NONLINEMNUAL")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class OnlineManual extends BaseEntity {

    @Id
    @Column(name = "ONLINE_MNL_ID", length = 20)
    private String onlineMnlId;

    @Column(name = "ONLINE_MNL_NM", length = 255, nullable = false)
    private String onlineMnlNm;

    @Column(name = "ONLINE_MNL_SE_CODE", length = 3, nullable = false)
    private String onlineMnlSeCode;

    @Column(name = "ONLINE_MNL_DFN", length = 1000)
    private String onlineMnlDf;

    @Column(name = "ONLINE_MNL_DC", columnDefinition = "TEXT")
    private String onlineMnlDc;

    public void update(String onlineMnlNm, String onlineMnlSeCode, String onlineMnlDf, String onlineMnlDc) {
        this.onlineMnlNm = onlineMnlNm;
        this.onlineMnlSeCode = onlineMnlSeCode;
        this.onlineMnlDf = onlineMnlDf;
        this.onlineMnlDc = onlineMnlDc;
    }
}
