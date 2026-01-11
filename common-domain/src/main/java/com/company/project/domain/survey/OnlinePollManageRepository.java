package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnlinePollManageRepository extends JpaRepository<OnlinePollManage, String> {
    List<OnlinePollManage> findByPollDsuseYnAndPollAutoDsuseYn(String dsuseYn, String autoDsuseYn);
}
