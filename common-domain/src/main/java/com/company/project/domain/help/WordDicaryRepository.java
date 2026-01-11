package com.company.project.domain.help;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WordDicaryRepository extends JpaRepository<WordDicary, String> {
}
