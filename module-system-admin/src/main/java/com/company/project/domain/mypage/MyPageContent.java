package com.company.project.domain.mypage;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "COMTNMYPAGECNTNTS")
public class MyPageContent {

    @Id
    @Column(name = "CNTNTS_ID", length = 20)
    private String cntntsId;

    @Column(name = "CNTNTS_NM", length = 100)
    private String cntntsNm;

    @Column(name = "CNTNTS_LINK_URL", length = 255)
    private String cntntsLinkUrl;

    @Column(name = "CNTNTS_DC", length = 1000)
    private String cntntsDc;

    @Column(name = "CNTNTS_USE_AT", length = 1)
    private String cntntsUseAt;

    @Column(name = "FRST_REGISTER_ID", length = 20)
    private String frstRegisterId;

    @Column(name = "FRST_REGIST_PNTTM")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDUSR_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public MyPageContent(String cntntsId, String cntntsNm, String cntntsLinkUrl,
            String cntntsDc, String cntntsUseAt, String frstRegisterId) {
        this.cntntsId = cntntsId;
        this.cntntsNm = cntntsNm;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
        this.cntntsUseAt = cntntsUseAt;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String cntntsNm, String cntntsLinkUrl,
            String cntntsDc, String cntntsUseAt, String updusrId) {
        this.cntntsNm = cntntsNm;
        this.cntntsLinkUrl = cntntsLinkUrl;
        this.cntntsDc = cntntsDc;
        this.cntntsUseAt = cntntsUseAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
