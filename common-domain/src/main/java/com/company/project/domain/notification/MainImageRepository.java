package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationMainImageRepository")
public interface MainImageRepository extends JpaRepository<MainImage, String> {
}
