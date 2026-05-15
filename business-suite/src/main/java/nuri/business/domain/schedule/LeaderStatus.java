package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 간부 상태 엔티티
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_LEADER_STTS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LeaderStatus extends BaseEntity {

    @Id
    @Column(name = "LEADER_ID", length = 20)
    private String leaderId;

    @Column(name = "LEADER_STTUS", length = 1)
    private String leaderSttus;

    public void updateStatus(String leaderSttus) {
        this.leaderSttus = leaderSttus;
    }
}
