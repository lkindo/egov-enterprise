package nuri.business.domain.operation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardManageRepository extends JpaRepository<RewardManage, Long> {

    /** 포상명 부분일치 검색(페이징). 목록 API 표준(PageResponse) 대응. */
    Page<RewardManage> findByRwrdNmContaining(String name, Pageable pageable);

    List<RewardManage> findByRwrdUserId(String winnerId);
}
