package com.company.project.domain.meeting;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MeetingManageRepository extends JpaRepository<MeetingManage, String> {
    Page<MeetingManage> findByMtgNmContaining(String keyword, Pageable pageable);
}