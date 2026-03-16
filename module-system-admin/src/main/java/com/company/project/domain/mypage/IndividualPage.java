package com.company.project.domain.mypage;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 마이페이지 설정 엔티티
 * 매핑 테이블: NINDVDLPGE
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NINDVDLPGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class IndividualPage extends BaseEntity {

    @Id
    @Column(name = "PGE_ID", length = 20)
    private String pageId;

    @Column(name = "PGE_NM", length = 255, nullable = false)
    private String pageNm;

    @Column(name = "PGE_DC", length = 1000)
    private String pageDc;

    @Column(name = "EMPLYR_ID", length = 20, nullable = false)
    private String userId;

    public void update(String pageNm, String pageDc) {
        this.pageNm = pageNm;
        this.pageDc = pageDc;
    }
}
