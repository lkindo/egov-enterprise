package com.company.project.domain.rsm;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "NRECENTSRCHWRD")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class RecentSrchwrd extends BaseTimeEntity {

    @Id
    @Column(name = "RECENT_SRCHWRD_ID", length = 20)
    private String srchwrdId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SRCHWRD_MANAGE_ID")
    private RecentSrchwrdManage recentSrchwrdManage;

    @Column(name = "RECENT_SRCHWRD_NM", length = 255, nullable = false)
    private String srchwrdNm;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;
}
