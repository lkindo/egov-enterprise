package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationRssTagRepository")
public interface RssTagRepository extends JpaRepository<RssTag, String> {
}
