package nuri.business.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
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
@Table(name = "tb_onln_poll_rslt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollResult extends BaseEntity {

    @Id
    @Column(length = 20)
    private String pollRsltId;

    @Column(length = 20, nullable = false)
    private String pollId;

    @Column(length = 20, nullable = false)
    private String pollArtclId;
}
