package nuri.business.domain.system.service.survey;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import lombok.*;

/**
 * 온라인 폴 항목 엔티티 (표준화)
 * 매핑 테이블: tb_onln_poll_artcl
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder/@AllArgsConstructor 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 * 감사 필드는 표준 Auditing 파이프라인에 위임. 연관 pollManage 는 빌더로 설정하므로 팩토리 파라미터에 포함.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_onln_poll_artcl")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnlinePollArticle extends BaseEntity {

    @Id
    @Column(length = 20)
    private String pollArtclId;

    @ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "poll_id")
    private OnlinePollManage pollManage;

    @Column(length = 100, nullable = false)
    private String pollArtclNm;

    private OnlinePollArticle(String pollArtclId, OnlinePollManage pollManage, String pollArtclNm) {
        this.pollArtclId = pollArtclId;
        this.pollManage = pollManage;
        this.pollArtclNm = pollArtclNm;
    }

    @Builder
    public static OnlinePollArticle create(String pollArtclId, OnlinePollManage pollManage, String pollArtclNm) {
        return new OnlinePollArticle(pollArtclId, pollManage, pollArtclNm);
    }

    public void update(String pollArtclNm) {
        this.pollArtclNm = pollArtclNm;
    }
}
