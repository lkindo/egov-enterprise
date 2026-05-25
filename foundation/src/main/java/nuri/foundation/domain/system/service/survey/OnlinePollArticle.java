package nuri.foundation.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 온라인 폴 항목 엔티티 (표준화)
 * 매핑 테이블: tb_onln_poll_artcl
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_onln_poll_artcl")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollArticle extends BaseEntity {

    @Id
    @Column(name = "poll_artcl_id", length = 20)
    private String pollArtclId;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "poll_id")
    private OnlinePollManage pollManage;

    @Column(length = 100, nullable = false)
    private String pollArtclNm;

    public void update(String pollArtclNm) {
        this.pollArtclNm = pollArtclNm;
    }
}
