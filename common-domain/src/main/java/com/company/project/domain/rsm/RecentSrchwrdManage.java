package com.company.project.domain.rsm;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 최근 검색어 관리 정보 Entity
 * 레거시 테이블: NRECENTSRCHWRDMANAGE
 */
@Entity
@Table(name = "NRECENTSRCHWRDMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecentSrchwrdManage extends BaseEntity {

    @Id
    @Column(name = "SRCHWRD_MANAGE_ID", length = 20)
    private String srchwrdManageId;

    @Column(name = "SRCHWRD_MANAGE_NM", length = 255, nullable = false)
    private String srchwrdManageNm;

    @Column(name = "SRCHWRD_CONECT_URL", length = 255)
    private String srchwrdConectUrl;

    @Column(name = "USER_SEARCH_AT", length = 1)
    private String userSearchAt;

    @Builder
    public RecentSrchwrdManage(String srchwrdManageId, String srchwrdManageNm, String srchwrdConectUrl, String userSearchAt) {
        this.srchwrdManageId = srchwrdManageId;
        this.srchwrdManageNm = srchwrdManageNm;
        this.srchwrdConectUrl = srchwrdConectUrl;
        this.userSearchAt = userSearchAt != null ? userSearchAt : "Y";
    }

    public void update(String srchwrdManageNm, String srchwrdConectUrl, String userSearchAt) {
        this.srchwrdManageNm = srchwrdManageNm;
        this.srchwrdConectUrl = srchwrdConectUrl;
        this.userSearchAt = userSearchAt;
    }
}
