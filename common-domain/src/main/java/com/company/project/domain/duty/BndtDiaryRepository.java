package com.company.project.domain.duty;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * ?諭彛???? Repository
 */
public interface BndtDiaryRepository extends JpaRepository<BndtDiary, BndtDiaryId> {
    List<BndtDiary> findByBndtIdAndBndtDe(String bndtId, String bndtDe);
    void deleteByBndtIdAndBndtDe(String bndtId, String bndtDe);
    List<BndtDiary> findByBndtDeStartingWith(String bndtDePrefix);
}
