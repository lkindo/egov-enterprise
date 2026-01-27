package com.company.project.domain.duty;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DutyDiaryRepository extends JpaRepository<DutyDiary, DutyDiary.DutyDiaryId> {
    List<DutyDiary> findById_BndtIdAndId_BndtDe(String bndtId, String bndtDe);

    List<DutyDiary> findById_BndtDeStartingWith(String bndtDePrefix);

    void deleteById_BndtIdAndId_BndtDe(String bndtId, String bndtDe);
}
