package com.company.project.domain.mypage;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "COMTNINDVDLPGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class IndividualPage extends BaseTimeEntity {

    @Id
    @Column(name = "PGE_ID", length = 20)
    private String pageId;

    @Column(name = "PGE_NM", length = 255, nullable = false)
    private String pageNm;

    @Column(name = "PGE_DC", length = 1000)
    private String pageDc;

    @Column(name = "EMPLYR_ID", length = 20, nullable = false)
    private String userId;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String pageNm, String pageDc, String lastUpdusrId) {
        this.pageNm = pageNm;
        this.pageDc = pageDc;
        this.lastUpdusrId = lastUpdusrId;
    }
}
