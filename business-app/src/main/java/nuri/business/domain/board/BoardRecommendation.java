package nuri.business.domain.board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.domain.common.BaseEntity;
import org.springframework.data.domain.Persistable;

/**
 * 게시글 추천 이력. (게시글, 사용자 esntlId) 한 쌍이 한 번의 추천이다(2026-09-26 DIP I6 ④).
 *
 * <p>행은 추천할 때 한 번 만들고 고치지 않는다. 식별자가 요청 전에 정해지므로 {@link Persistable#isNew()} 를
 * 참으로 두어 {@code save()} 가 병합(SELECT 후 UPDATE)이 아니라 INSERT 를 하게 한다 — 두 번째 추천은
 * PK 충돌로 드러나고 조용히 덮이지 않는다.</p>
 */
@Entity
@Table(name = "tb_bbs_rcmdtn_hstry")
@IdClass(BoardRecommendationId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BoardRecommendation extends BaseEntity implements Persistable<BoardRecommendationId> {

    @Id
    @Column(name = "pst_sn", nullable = false, updatable = false)
    private Long pstSn;

    /** 추천한 사람의 esntlId. 감사 컬럼(frst_rgtr_id, loginId)과 축이 다르다. */
    @Id
    @Column(name = "user_id", nullable = false, length = 20, updatable = false)
    private String userId;

    public static BoardRecommendation of(Long pstSn, String userId) {
        BoardRecommendation recommendation = new BoardRecommendation();
        recommendation.pstSn = Objects.requireNonNull(pstSn);
        recommendation.userId = Objects.requireNonNull(userId);
        return recommendation;
    }

    @Override
    @Transient
    public BoardRecommendationId getId() {
        return new BoardRecommendationId(pstSn, userId);
    }

    @Override
    @Transient
    public boolean isNew() {
        return true;
    }
}
