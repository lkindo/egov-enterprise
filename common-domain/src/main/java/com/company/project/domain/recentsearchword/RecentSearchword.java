package com.company.project.domain.recentsearchword;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 최근 검색어 Entity
 */
@Entity
@Table(name = "NRECENTSRCHWRD")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecentSearchword extends BaseEntity {

    @Id
    @Column(name = "RECENT_SRCHWRD_ID", length = 20)
    private String searchwordId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SRCHWRD_MANAGE_ID")
    private RecentSearchwordManage recentSearchwordManage;

    @Column(name = "RECENT_SRCHWRD_NM", length = 255, nullable = false)
    private String searchwordNm;

    @Column(name = "SRCHWRD_MANAGE_ID", insertable = false, updatable = false)
    private String searchwordManageId;

    public String getSearchwordManageId() {
        return recentSearchwordManage != null ? recentSearchwordManage.getSearchwordManageId() : searchwordManageId;
    }
}
