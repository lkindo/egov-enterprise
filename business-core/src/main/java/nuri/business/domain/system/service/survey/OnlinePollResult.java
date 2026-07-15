package nuri.business.domain.system.service.survey;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.*;

/**
 * 온라인 폴 결과 엔티티.
 * 매핑 테이블: tb_onln_poll_rslt
 *
 * <p><b>불변식:</b> {@code (poll_id, frst_rgtr_id)} UNIQUE — 한 설문당 사용자(loginId) 1표.
 * 애플리케이션 검사(count)는 TOCTOU 경합을 막지 못하므로 이 DB 유니크 제약이 권위 있는 백스톱이다.
 * (V2_4 마이그레이션 참조)</p>
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@Entity
@Table(name = "tb_onln_poll_rslt", uniqueConstraints = {
    @UniqueConstraint(
        name = "uk_tb_onln_poll_rslt_poll_voter",
        columnNames = {"poll_id", "frst_rgtr_id"}
    )
})
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
