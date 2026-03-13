package com.company.project.repository.operation;

import com.company.project.domain.operation.RewardManage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardManageRepository extends JpaRepository<RewardManage, String> {
    List<RewardManage> findByRwardNmContaining(String name);
    List<RewardManage> findByRwardwnrId(String winnerId);
}
