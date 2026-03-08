package com.company.project.domain.image;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MainImageDomainRepository extends JpaRepository<MainImage, String> {
    List<MainImage> findByReflctAt(String reflctAt);
}
