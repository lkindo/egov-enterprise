package com.company.project.domain.meeting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MeetingManageRepository extends JpaRepository<MeetingManage, String> {
}
