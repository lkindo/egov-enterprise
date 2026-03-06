package com.company.project.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("boardTemplateRepository")
public interface TemplateRepository extends JpaRepository<Template, String> {
}
