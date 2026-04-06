package nuri.foundation.domain.workspace;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NINDVDLPGECNTNTS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MyPageContent {

    @Id
    @Column(name = "CNTNTS_ID", length = 20)
    private String cntntsId;

    @Column(name = "CNTNTS_NM", length = 100)
    private String cntntsNm;

    @Column(name = "CNTC_URL", length = 255)
    private String cntcUrl;

    @Column(name = "CNTNTS_USE_AT", length = 1)
    private String cntntsUseAt;

    @Column(name = "CNTNTS_LINK_URL", length = 255)
    private String cntntsLinkUrl;

    @Column(name = "CNTNTS_DC", length = 255)
    private String cntntsDc;

    @Builder
    public MyPageContent(String cntntsId, String cntntsNm, String cntcUrl, String cntntsUseAt, 
                          String cntntsLinkUrl, String cntntsDc) {
        this.cntntsId = cntntsId;
        this.cntntsNm = cntntsNm;
        this.cntcUrl = cntcUrl;
        this.cntntsUseAt = cntntsUseAt == null ? "Y" : cntntsUseAt;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }

    public void update(String cntntsNm, String cntcUrl, String cntntsUseAt, String cntntsLinkUrl, String cntntsDc) {
        this.cntntsNm = cntntsNm;
        this.cntcUrl = cntcUrl;
        this.cntntsUseAt = cntntsUseAt;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
    }
}
