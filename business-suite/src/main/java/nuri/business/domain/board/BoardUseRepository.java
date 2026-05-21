package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BoardUseRepository extends JpaRepository<BoardUse, BoardUseId> {

    @Query("SELECT bu FROM BoardUse bu WHERE bu.trgtId = :trgtId AND bu.useYn = 'Y'")
    List<BoardUse> findByTrgtIdAndUseYnY(@Param("trgtId") String trgtId);

    @Query("SELECT bu FROM BoardUse bu WHERE bu.useYn = 'Y'")
    Page<BoardUse> findAllActive(Pageable pageable);

    void deleteByBbsId(String bbsId);
}
