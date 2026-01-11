package com.company.project.domain.notification;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExtrlHrRepository extends JpaRepository<ExtrlHr, String> {
    List<ExtrlHr> findByEventId(String eventId);

    void deleteByEventId(String eventId);
}
