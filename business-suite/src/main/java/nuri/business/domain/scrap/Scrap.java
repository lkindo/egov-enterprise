package nuri.business.domain.scrap;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 스크랩 정보 Entity (v5 standardized)
 * 매핑 테이블: TB_BBS_SCRAP
 */
@Entity
@Table(name = "tb_bbs_scrap")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Scrap extends BaseEntity {

    @Id
    @Column(name = "scrap_id", length = 20)
    private String scrapId;

    @Column(name = "bbs_id", length = 20)
    private String bbsId;

    @Column(name = "pst_id", length = 20)
    private String pstId;

    @Column(name = "scrap_nm", length = 100)
    private String scrapNm;

    @Column(name = "scrap_url", length = 1000)
    private String scrapUrl;

    @Column(name = "scrap_expln", length = 2000)
    private String scrapDc;

    @Column(name = "use_yn", length = 1)
    @Builder.Default
    private String useYn = "Y";

    public String getUniqId() {
        return getFrstRegisterId();
    }

    public void update(String scrapNm, String scrapUrl, String scrapDc, String useYn) {
        this.scrapNm = scrapNm;
        this.scrapUrl = scrapUrl;
        this.scrapDc = scrapDc;
        this.useYn = useYn;
    }

    // legacy
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }
}
