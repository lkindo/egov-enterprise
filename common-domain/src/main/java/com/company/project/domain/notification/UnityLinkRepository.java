package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationUnityLinkRepository")
public interface UnityLinkRepository extends JpaRepository<UnityLink, String> {
}
