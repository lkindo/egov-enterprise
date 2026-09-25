package nuri.business.domain.board;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/** {@link BoardRecommendation} 의 복합 식별자 — (게시글, 사용자 esntlId). */
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BoardRecommendationId implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long pstSn;
    private String userId;
}
