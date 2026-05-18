package nuri.foundation.domain.workspace;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 마이페이지 콘텐츠 엔티티 (NINDVDLPGECNTNTS)
 * [Audit] BaseEntity 상속
 */
@Entity
@Table(name = "TB_INDV_PG_CONTS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class MyPageContent extends BaseEntity {

    @Id
    @Column(name = "CNTNTS_ID", length = 20)
    private String cntntsId;

    @Column(name = "CNTNTS_NM", length = 100)
    private String cntntsNm;

    @Column(name = "CNTC_URL", length = 255)
    private String cntcUrl;

    @Column(name = "CNTNTS_USE_YN", length = 1)
    private String cntntsUseAt;

    @Column(name = "CNTNTS_LINK_URL", length = 255)
    private String cntntsLinkUrl;

    @Column(name = "CNTNTS_DC", length = 255)
    private String cntntsDc;

    public void update(String cntntsNm, String cntcUrl, String cntntsUseAt, String cntntsLinkUrl, String cntntsDc) {
        this.cntntsNm = cntntsNm;
        this.cntcUrl = cntcUrl;
        this.cntntsUseAt = cntntsUseAt;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }
}
