package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationEventCmpgnRepository")
public interface EventCmpgnRepository extends JpaRepository<EventCmpgn, String> {
}
