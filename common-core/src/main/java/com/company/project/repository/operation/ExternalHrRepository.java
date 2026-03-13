package com.company.project.repository.operation;

import com.company.project.domain.operation.ExternalHr;
import com.company.project.domain.operation.ExternalHrId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExternalHrRepository extends JpaRepository<ExternalHr, ExternalHrId> {
    List<ExternalHr> findByEventId(String eventId);
    List<ExternalHr> findByExtrlHrNmContaining(String name);
}
