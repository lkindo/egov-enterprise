package com.company.project.domain.wiki;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 위키 북마크 정보 Entity
 * 레거시 테이블: NWIKIBKMK
 */
@Entity
@Table(name = "NWIKIBKMK")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WikiBookmark extends BaseEntity {

    @Id
    @Column(name = "WIKI_BKMK_ID", length = 20)
    private String wikiBkmkId;

    @Column(name = "USER_ID", length = 20, nullable = false)
    private String userId;

    @Column(name = "WIKI_BKMK_NM", length = 255, nullable = false)
    private String wikiBkmkNm;

    @Builder
    public WikiBookmark(String wikiBkmkId, String userId, String wikiBkmkNm, String frstRegisterId,
            String lastUpdusrId) {
        this.wikiBkmkId = wikiBkmkId;
        this.userId = userId;
        this.wikiBkmkNm = wikiBkmkNm;
        this.createdBy = frstRegisterId;
        this.lastModifiedBy = lastUpdusrId;
    }

    public void update(String wikiBkmkNm) {
        this.wikiBkmkNm = wikiBkmkNm;
    }

    public LocalDateTime getFrstRegistPnttm() {
        return getCreatedDate();
    }
}
