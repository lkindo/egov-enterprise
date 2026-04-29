package nuri.foundation.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OnlinePollManageRepository extends JpaRepository<OnlinePollManage, String> {
    List<OnlinePollManage> findByPollDsuseYnAndPollAutoDsuseYn(String dsuseYn, String autoDsuseYn);

    Page<OnlinePollManage> findByPollNmContainingIgnoreCaseOrderByPollIdDesc(String keyword, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT p FROM OnlinePollManage p ORDER BY p.pollId DESC")
    Page<OnlinePollManage> findAllOrderByIdDesc(Pageable pageable);
}
