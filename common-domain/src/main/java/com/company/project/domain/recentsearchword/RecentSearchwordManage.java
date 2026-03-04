package com.company.project.domain.recentsearchword;

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
 * 최근 검색어 관리 Entity
 */
@Entity
@Table(name = "NRECENTSRCHWRDMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecentSearchwordManage extends BaseEntity {

    @Id
    @Column(name = "SRCHWRD_MANAGE_ID", length = 20)
    private String searchwordManageId;

    @Column(name = "SRCHWRD_MANAGE_NM", length = 255, nullable = false)
    private String searchwordManageNm;

    @Column(name = "SRCHWRD_CONECT_URL", length = 255)
    private String searchwordConectUrl;

    @Column(name = "USER_SEARCH_AT", length = 1)
    private String userSearchAt;

    @Builder
    public RecentSearchwordManage(String searchwordManageId, String searchwordManageNm, String searchwordConectUrl,
            String userSearchAt) {
        this.searchwordManageId = searchwordManageId;
        this.searchwordManageNm = searchwordManageNm;
        this.searchwordConectUrl = searchwordConectUrl;
        this.userSearchAt = userSearchAt != null ? userSearchAt : "Y";
    }

    public void update(String searchwordManageNm, String searchwordConectUrl, String userSearchAt) {
        this.update(searchwordManageNm, searchwordConectUrl, userSearchAt, null);
    }

    public void update(String searchwordManageNm, String searchwordConectUrl, String userSearchAt, String userId) {
        this.searchwordManageNm = searchwordManageNm;
        this.searchwordConectUrl = searchwordConectUrl;
        this.userSearchAt = userSearchAt;
        if (userId != null) {
            this.setLastModifiedBy(userId);
        }
    }
}