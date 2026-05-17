package nuri.foundation.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 온라인 폴 결과 엔티티
 * 매핑 테이블: NONLINEPOLLRESULT
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_ONLN_POLL_RSLT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollResult extends BaseEntity {

    @Id
    @Column(name = "POLL_RSLT_ID", length = 20)
    private String pollResultId;

    @Column(name = "POLL_ID", length = 20, nullable = false)
    private String pollId;

    @Column(name = "POLL_ARTCL_ID", length = 20, nullable = false)
    private String pollIemId;
}
