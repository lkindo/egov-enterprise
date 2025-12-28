package com.company.project.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QustnrQesitmRepository extends JpaRepository<QustnrQesitm, String> {
    List<QustnrQesitm> findByQestnrIdAndQestnrTmplatId(String qestnrId, String qestnrTmplatId);
}
