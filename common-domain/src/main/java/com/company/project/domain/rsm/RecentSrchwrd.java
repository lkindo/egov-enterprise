package com.company.project.domain.rsm;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 筌ㅼ뮄??野꺜??깅선 ?類ｋ궖 Entity
 * ??뉕탢?????뵠?? NRECENTSRCHWRD
 */
@Entity
@Table(name = "NRECENTSRCHWRD")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecentSrchwrd extends BaseEntity {

    @Id
    @Column(name = "RECENT_SRCHWRD_ID", length = 20)
    private String srchwrdId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SRCHWRD_MANAGE_ID")
    private RecentSrchwrdManage recentSrchwrdManage;

    @Column(name = "RECENT_SRCHWRD_NM", length = 255, nullable = false)
    private String srchwrdNm;

    @Column(name = "SRCHWRD_MANAGE_ID", insertable = false, updatable = false)
    private String srchwrdManageId;

    public String getSrchwrdManageId() {
        return recentSrchwrdManage != null ? recentSrchwrdManage.getSrchwrdManageId() : srchwrdManageId;
    }
}
