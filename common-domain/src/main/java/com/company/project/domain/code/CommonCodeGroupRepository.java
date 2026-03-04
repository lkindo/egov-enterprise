package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommonCodeGroupRepository
        extends JpaRepository<CommonCodeGroup, String>, CommonCodeGroupRepositoryCustom {
    List<CommonCodeGroup> findByClCode(String clCode);
}