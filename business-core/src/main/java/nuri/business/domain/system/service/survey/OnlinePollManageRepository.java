package nuri.business.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OnlinePollManageRepository extends JpaRepository<OnlinePollManage, Long> {
    List<OnlinePollManage> findByPollDsuseYnAndPollAtmcDsuseYn(String dsuseYn, String atmcDsuseYn);

    @Query("SELECT p FROM OnlinePollManage p WHERE LOWER(p.pollNm) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<OnlinePollManage> findByPollNmContaining(@Param("keyword") String keyword, Pageable pageable);
    
    // legacy support
    default Page<OnlinePollManage> findByPollTtlContaining(String keyword, Pageable pageable) {
        return findByPollNmContaining(keyword, pageable);
    }
}
