package com.company.project.domain.system;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImgTempRepository extends JpaRepository<ImgTemp, ImgTempId> {
}
