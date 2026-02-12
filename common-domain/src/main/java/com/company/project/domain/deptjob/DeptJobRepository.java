package com.company.project.domain.deptjob;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface DeptJobRepository extends JpaRepository<DeptJob, String>, QuerydslPredicateExecutor<DeptJob> {
}
