package com.company.project.domain.rss;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RssDomainRepository extends JpaRepository<Rss, String> {
}
