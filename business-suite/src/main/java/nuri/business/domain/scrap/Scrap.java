package nuri.business.domain.scrap;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/**
 * 스크랩 정보 Entity
 * 매핑 테이블: NSCRAP
 */
@Entity
@Table(name = "TB_BBS_SCRAP")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
public class Scrap extends BaseEntity {

    @Id
    @Column(name = "SCRAP_ID", length = 20)
    private String scrapId;

    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Column(name = "NTT_ID")
    private Long nttId;

    @Column(name = "SCRAP_NM", length = 100)
    private String scrapNm;

    @Column(name = "SCRAP_URL", length = 1000)
    private String scrapUrl;

    @Column(name = "SCRAP_DC", length = 2000)
    private String scrapDc;

    @Column(name = "USE_YN", length = 1)
    private String useYn;

    public String getUniqId() {
        return getFrstRegisterId();
    }

    public void update(String scrapNm, String scrapUrl, String scrapDc, String useYn) {
        this.scrapNm = scrapNm;
        this.scrapUrl = scrapUrl;
        this.scrapDc = scrapDc;
        this.useYn = useYn;
    }
}
