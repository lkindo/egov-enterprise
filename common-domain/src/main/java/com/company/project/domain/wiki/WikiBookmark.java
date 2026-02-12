package com.company.project.domain.wiki;

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
 * 위키 북마크 정보 Entity
 * 레거시 테이블: NWIKIBKMK
 */
@Entity
@Table(name = "NWIKIBKMK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WikiBookmark extends BaseEntity {

    @Id
    @Column(name = "WIKI_BKMK_ID", length = 20)
    private String wikiBkmkId;

    @Column(name = "USER_ID", length = 20, nullable = false)
    private String userId;

    @Column(name = "WIKI_BKMK_NM", length = 255, nullable = false)
    private String wikiBkmkNm;

    @Builder
    public WikiBookmark(String wikiBkmkId, String userId, String wikiBkmkNm) {
        this.wikiBkmkId = wikiBkmkId;
        this.userId = userId;
        this.wikiBkmkNm = wikiBkmkNm;
    }

    public void update(String wikiBkmkNm) {
        this.wikiBkmkNm = wikiBkmkNm;
    }
}
