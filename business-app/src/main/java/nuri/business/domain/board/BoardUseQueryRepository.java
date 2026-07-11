package nuri.business.domain.board;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import java.util.List;

import static nuri.business.domain.board.QBoardUse.boardUse;

@Repository
@RequiredArgsConstructor
public class BoardUseQueryRepository {

    private final JPAQueryFactory queryFactory;

    /**
     * 특정 대상 아이디(trgtId)와 사용 여부(useYn)를 기준으로 게시판 사용 정보를 동적으로 안전하게 조회합니다.
     * JPQL 대신 Querydsl을 활용하여 오타 방지 및 컴파일 타임 타입 세이프를 구현한 견본 예제입니다.
     */
    public List<BoardUse> findBoardUseByCondition(String trgtId, String useYn) {
        return queryFactory
                .selectFrom(boardUse)
                .where(
                        eqTrgtId(trgtId),
                        eqUseYn(useYn)
                )
                .fetch();
    }

    private BooleanExpression eqTrgtId(String trgtId) {
        return trgtId != null ? boardUse.trgtId.eq(trgtId) : null;
    }

    private BooleanExpression eqUseYn(String useYn) {
        return useYn != null ? boardUse.useYn.eq(useYn) : null;
    }
}
