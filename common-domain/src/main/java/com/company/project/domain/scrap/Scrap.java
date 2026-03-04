package com.company.project.domain.scrap;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ??쎄쾿??JPA Entity
 * ??뉕탢?????뵠?? COMTNSCRAP
 */
@Entity
@Table(name = "NSCRAP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @Builder
    public Scrap(String scrapId, String bbsId, Long nttId, String scrapNm,
            String useAt, String uniqId, String frstRegisterId) {
        this.scrapId = scrapId;
        this.bbsId = bbsId;
        this.nttId = nttId;
        this.scrapNm = scrapNm;
        this.useAt = useAt;
        this.setFrstRegisterId(frstRegisterId != null ? frstRegisterId : uniqId);
    }

    public String getUniqId() {
        return getFrstRegisterId();
    }

    public void update(String scrapNm, String useAt, String updusrId) {
        this.scrapNm = scrapNm;
        this.useAt = useAt;
        this.setLastUpdusrId(updusrId);
    }
}