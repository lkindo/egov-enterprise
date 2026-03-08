package com.company.project.domain.schedule;

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

        @Query("""
                        SELECT m FROM MemoTodo m
                        WHERE m.wrterId = :wrterId
                          AND (:searchDe = '1' AND m.createdDate BETWEEN :searchBgnDt AND :searchEndDt
                               OR :searchDe = '0' AND (SUBSTR(m.todoBeginTime, 1, 10) BETWEEN :searchBgnDe AND :searchEndDe
                                                    OR SUBSTR(m.todoEndTime, 1, 10) BETWEEN :searchBgnDe AND :searchEndDe)
                               OR :searchDe IS NULL OR :searchDe = '')
                          AND (:searchCondition = '0' AND m.todoNm LIKE '%' || :searchWrd || '%'
                               OR :searchCondition = '1' AND m.todoCn LIKE '%' || :searchWrd || '%'
                               OR :searchWrd IS NULL OR :searchWrd = '')
                        ORDER BY m.todoBeginTime DESC
                        """)
        Page<MemoTodo> searchMemoTodos(@Param("wrterId") String wrterId,
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
                        WHERE m.wrterId = :wrterId
                          AND (m.todoBeginTime BETWEEN :searchBgnDe AND :searchEndDe
                               OR m.todoEndTime BETWEEN :searchBgnDe AND :searchEndDe)
                        ORDER BY m.createdDate DESC
                        """)
        List<MemoTodo> selectMemoTodoListToday(@Param("wrterId") String wrterId,
                        @Param("searchBgnDe") String searchBgnDe,
                        @Param("searchEndDe") String searchEndDe);
}
