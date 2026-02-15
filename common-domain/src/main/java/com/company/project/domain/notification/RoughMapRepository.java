package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationRoughMapRepository")
public interface RoughMapRepository extends JpaRepository<RoughMap, String> {
}
