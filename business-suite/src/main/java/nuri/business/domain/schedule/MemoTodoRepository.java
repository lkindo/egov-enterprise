package nuri.business.domain.schedule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MemoTodoRepository extends JpaRepository<MemoTodo, String> {
        Page<MemoTodo> findByUserId(String userId, Pageable pageable);

        @Query("""
                        SELECT m FROM MemoTodo m
                        WHERE m.userId = :userId
                          AND (:searchDe = '1' AND m.createdDate BETWEEN :searchBgnDt AND :searchEndDt
                                OR :searchDe = '0' AND (SUBSTR(m.todoBgngTm, 1, 10) BETWEEN :searchBgnDe AND :searchEndDe
                                                     OR SUBSTR(m.todoEndTm, 1, 10) BETWEEN :searchBgnDe AND :searchEndDe)
                                OR :searchDe IS NULL OR :searchDe = '')
                          AND (:searchCondition = '0' AND m.todoTtl LIKE '%' || :searchWrd || '%'
                               OR :searchCondition = '1' AND m.todoCn LIKE '%' || :searchWrd || '%'
                               OR :searchWrd IS NULL OR :searchWrd = '')
                        ORDER BY m.todoBgngTm DESC
                        """)
        Page<MemoTodo> searchMemoTodos(@Param("userId") String userId,
                        @Param("searchDe") String searchDe,
                        @Param("searchBgnDe") String searchBgnDe,
                        @Param("searchEndDe") String searchEndDe,
                        @Param("searchBgnDt") LocalDateTime searchBgnDt,
                        @Param("searchEndDt") LocalDateTime searchEndDt,
                        @Param("searchCondition") String searchCondition,
                        @Param("searchWrd") String searchWrd,
                        Pageable pageable);

        @Query("""
                        SELECT m FROM MemoTodo m
                        WHERE m.userId = :userId
                          AND (m.todoBgngTm BETWEEN :searchBgnDe AND :searchEndDe
                               OR m.todoEndTm BETWEEN :searchBgnDe AND :searchEndDe)
                        ORDER BY m.createdDate DESC
                        """)
        List<MemoTodo> selectMemoTodoListToday(@Param("userId") String userId,
                        @Param("searchBgnDe") String searchBgnDe,
                        @Param("searchEndDe") String searchEndDe);
}
