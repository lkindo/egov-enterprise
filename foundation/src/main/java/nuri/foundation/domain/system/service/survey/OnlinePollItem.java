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
 * 온라인 폴 항목 엔티티
 * 매핑 테이블: TB_ONLN_POLL_ARTCL
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_ONLN_POLL_ARTCL")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollItem extends BaseEntity {

    @Id
    @Column(name = "POLL_ARTCL_ID", length = 20)
    private String pollIemId;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "POLL_ID")
    private OnlinePollManage pollManage;

    @Column(name = "POLL_ARTCL_NM", length = 255, nullable = false)
    private String pollIemNm;

    public void update(String pollIemNm) {
        this.pollIemNm = pollIemNm;
    }

    // legacy getters for compatibility
    public String getPollIemId() { return pollIemId; }
    public String getPollIemNm() { return pollIemNm; }
}
