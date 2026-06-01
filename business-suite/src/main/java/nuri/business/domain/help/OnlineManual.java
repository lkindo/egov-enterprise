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
    private String onlnMnlId;

    @Column(length = 100, nullable = false)
    private String onlnMnlNm;

    @Column(length = 12, nullable = false)
    private String onlnMnlSeCd;

    @Column(length = 1000)
    private String onlnMnlDfn;

    @Column(columnDefinition = "TEXT", length = 4000)
    private String onlnMnlExpln;

    public void update(String onlnMnlNm, String onlnMnlSeCd, String onlnMnlDfn, String onlnMnlExpln) {
        this.onlnMnlNm = onlnMnlNm;
        this.onlnMnlSeCd = onlnMnlSeCd;
        this.onlnMnlDfn = onlnMnlDfn;
        this.onlnMnlExpln = onlnMnlExpln;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
