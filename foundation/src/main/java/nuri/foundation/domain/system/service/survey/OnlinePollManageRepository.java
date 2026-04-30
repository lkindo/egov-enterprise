package nuri.foundation.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OnlinePollManageRepository extends JpaRepository<OnlinePollManage, String> {
    List<OnlinePollManage> findByPollDsuseYnAndPollAutoDsuseYn(String dsuseYn, String autoDsuseYn);

    @Query("SELECT p FROM OnlinePollManage p WHERE LOWER(p.pollNm) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<OnlinePollManage> findByPollNmContaining(@Param("keyword") String keyword, Pageable pageable);
}
