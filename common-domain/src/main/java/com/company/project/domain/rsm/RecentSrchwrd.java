package com.company.project.domain.rsm;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 최근 검색어 정보 Entity
 * 레거시 테이블: NRECENTSRCHWRD
 */
@Entity
@Table(name = "NRECENTSRCHWRD")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecentSrchwrd extends BaseEntity {

    @Id
    @Column(name = "RECENT_SRCHWRD_ID", length = 20)
    private String srchwrdId;

    @Column(name = "SRCHWRD_MANAGE_ID", length = 20, nullable = false)
    private String srchwrdManageId;

    @Column(name = "RECENT_SRCHWRD_NM", length = 255, nullable = false)
    private String srchwrdNm;

    @Builder
    public RecentSrchwrd(String srchwrdId, String srchwrdManageId, String srchwrdNm) {
        this.srchwrdId = srchwrdId;
        this.srchwrdManageId = srchwrdManageId;
        this.srchwrdNm = srchwrdNm;
    }
}
