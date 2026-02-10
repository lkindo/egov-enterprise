package com.company.project.domain.batch;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BatchSchdulDfkRepository extends JpaRepository<BatchSchdulDfk, BatchSchdulDfkId> {
    List<BatchSchdulDfk> findByBatchSchdulId(String batchSchdulId);

    void deleteByBatchSchdulId(String batchSchdulId);
}
