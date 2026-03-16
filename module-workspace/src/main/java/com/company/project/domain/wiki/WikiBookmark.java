package com.company.project.domain.wiki;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

/**
 * ?袁り텕 ?브낮彛???類ｋ궖 Entity
 * ??뉕탢?????뵠?? NWIKIBKMK
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NWIKIBKMK")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class WikiBookmark extends BaseEntity {

    @Id
    @Column(name = "WIKI_BKMK_ID", length = 20)
    private String wikiBkmkId;

    @Column(name = "USER_ID", length = 20, nullable = false)
    private String userId;

    @Column(name = "WIKI_BKMK_NM", length = 255, nullable = false)
    private String wikiBkmkNm;

    public void update(String wikiBkmkNm) {
        this.wikiBkmkNm = wikiBkmkNm;
    }

    public LocalDateTime getFrstRegistPnttm() {
        return getCreatedDate();
    }
}
