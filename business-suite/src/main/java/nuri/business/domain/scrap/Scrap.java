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
@Table(name = "NSCRAP")
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

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public String getUniqId() {
        return getFrstRegisterId();
    }

    public void update(String scrapNm, String useAt) {
        this.scrapNm = scrapNm;
        this.useAt = useAt;
    }
}
