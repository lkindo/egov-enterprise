package com.company.project.domain.rsm;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "COMTNRECENTSRCHWRDMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RecentSrchwrdManage extends BaseTimeEntity {

    @Id
    @Column(name = "SRCHWRD_MANAGE_ID", length = 20)
    private String srchwrdManageId;

    @Column(name = "SRCHWRD_MANAGE_NM", length = 255, nullable = false)
    private String srchwrdManageNm;

    @Column(name = "SRCHWRD_CONECT_URL", length = 255)
    private String srchwrdConectUrl;

    @Column(name = "USER_SEARCH_AT", length = 1)
    private String userSearchAt;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String srchwrdManageNm, String srchwrdConectUrl, String userSearchAt, String lastUpdusrId) {
        this.srchwrdManageNm = srchwrdManageNm;
        this.srchwrdConectUrl = srchwrdConectUrl;
        this.userSearchAt = userSearchAt;
        this.lastUpdusrId = lastUpdusrId;
    }
}
