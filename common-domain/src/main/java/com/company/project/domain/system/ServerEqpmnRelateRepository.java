package com.company.project.domain.system;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerEqpmnRelateRepository extends JpaRepository<ServerEqpmnRelate, ServerEqpmnRelateId> {
    void deleteByServerId(String serverId);

    void deleteByServerIdAndServerEqpmnId(String serverId, String serverEqpmnId);
}
