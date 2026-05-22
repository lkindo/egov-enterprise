package nuri.foundation.repository.operation;

import nuri.foundation.domain.operation.RewardManage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardManageRepository extends JpaRepository<RewardManage, String> {
    List<RewardManage> findByRwrdNmContaining(String name);
    List<RewardManage> findByRwrdUserId(String winnerId);
}
