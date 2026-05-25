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

    @Column(length = 20)
    private String bbsId;

    @Column(length = 20)
    private String pstId;

    @Column(length = 100)
    private String scrapNm;

    @Column(length = 1000)
    private String scrapUrl;

    @Column(length = 4000)
    private String scrapExpln;

    @Column(length = 1)
    @Builder.Default
    private String useYn = "Y";

    public String getUniqId() {
        return getFrstRegisterId();
    }

    public void update(String scrapNm, String scrapUrl, String scrapExpln, String useYn) {
        this.scrapNm = scrapNm;
        this.scrapUrl = scrapUrl;
        this.scrapExpln = scrapExpln;
        this.useYn = useYn;
    }

    // legacy
    public String getNttId() { return pstId; }
    public void setNttId(String v) { this.pstId = v; }

    // ----- [Legacy Aliases for Backward Compatibility] -----

    @Deprecated
    public String getScrapDc() {
        return scrapExpln;
    }

    @Deprecated
    public void setScrapDc(String scrapDc) {
        this.scrapExpln = scrapDc;
    }

    public static abstract class ScrapBuilder<C extends Scrap, B extends ScrapBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String scrapExpln;

        @Deprecated
        public B scrapDc(String scrapDc) {
            this.scrapExpln = scrapDc;
            return self();
        }
    }
}
