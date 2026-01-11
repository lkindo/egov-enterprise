package com.company.project.domain.duty;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BndtDiaryRepository extends JpaRepository<BndtDiary, BndtDiaryId> {
    List<BndtDiary> findByBndtIdAndBndtDe(String bndtId, String bndtDe);

    int countByBndtIdAndBndtDe(String bndtId, String bndtDe);
}
