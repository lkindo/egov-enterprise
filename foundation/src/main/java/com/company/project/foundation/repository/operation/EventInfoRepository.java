package com.company.project.foundation.repository.operation;

import com.company.project.foundation.domain.operation.EventInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EventInfoRepository extends JpaRepository<EventInfo, String> {
}
