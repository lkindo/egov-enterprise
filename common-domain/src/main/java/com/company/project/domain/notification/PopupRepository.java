package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationPopupRepository")
public interface PopupRepository extends JpaRepository<Popup, String> {
}
