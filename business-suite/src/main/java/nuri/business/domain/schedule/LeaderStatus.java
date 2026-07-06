package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 간부 상태 엔티티
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_leader_stts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeaderStatus extends BaseEntity {

    @Id
    @Column(length = 20)
    private String leaderId;

    @Column(length = 12)
    private String leaderSttsCd;

    private LeaderStatus(String leaderId, String leaderSttsCd) {
        this.leaderId = leaderId;
        this.leaderSttsCd = leaderSttsCd;
    }

    @Builder
    public static LeaderStatus create(String leaderId, String leaderSttsCd) {
        return new LeaderStatus(leaderId, leaderSttsCd);
    }

    public void updateStatus(String leaderSttsCd) {
        this.leaderSttsCd = leaderSttsCd;
    }
}
