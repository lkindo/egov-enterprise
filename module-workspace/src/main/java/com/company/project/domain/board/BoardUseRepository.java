package com.company.project.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BoardUseRepository extends JpaRepository<BoardUse, BoardUseId> {

    @Query("SELECT bu FROM BoardUse bu WHERE bu.trgetId = :trgetId AND bu.useAt = 'Y'")
    List<BoardUse> findByTrgetIdAndUseAtY(@Param("trgetId") String trgetId);

    @Query("SELECT bu FROM BoardUse bu WHERE bu.useAt = 'Y'")
    Page<BoardUse> findAllActive(Pageable pageable);
}
