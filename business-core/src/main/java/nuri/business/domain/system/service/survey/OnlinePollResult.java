package nuri.business.domain.system.service.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

/**
 * 온라인 폴 결과 엔티티
 * 매핑 테이블: NONLINEPOLLRESULT
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_onln_poll_rslt")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnlinePollResult extends BaseEntity {

    @Id
    @Column(length = 20)
    private String pollRsltId;

    @Column(length = 20, nullable = false)
    private String pollId;

    @Column(length = 20, nullable = false)
    private String pollArtclId;

    private OnlinePollResult(String pollRsltId, String pollId, String pollArtclId) {
        this.pollRsltId = pollRsltId;
        this.pollId = pollId;
        this.pollArtclId = pollArtclId;
    }

    @Builder
    public static OnlinePollResult create(String pollRsltId, String pollId, String pollArtclId) {
        return new OnlinePollResult(pollRsltId, pollId, pollArtclId);
    }
}
