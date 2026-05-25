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
@Table(name = "tb_leader_stts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class LeaderStatus extends BaseEntity {

    @Id
    @Column(name = "leader_id", length = 20)
    private String leaderId;

    @Column(length = 12)
    private String leaderSttsCd;

    public void updateStatus(String leaderSttsCd) {
        this.leaderSttsCd = leaderSttsCd;
    }
}
