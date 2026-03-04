package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommonCodeCategoryRepository
        extends JpaRepository<CommonCodeCategory, String>, CommonCodeCategoryRepositoryCustom {
}
