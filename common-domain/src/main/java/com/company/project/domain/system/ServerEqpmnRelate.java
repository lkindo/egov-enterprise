package com.company.project.domain.system;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NSERVEREQPMNRELATE")
@IdClass(ServerEqpmnRelateId.class)
public class ServerEqpmnRelate {

    @Id
    @Column(name = "SERVER_ID", length = 20)
    private String serverId;

    @Id
    @Column(name = "SERVER_EQPMN_ID", length = 20)
    private String serverEqpmnId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    @Column(name = "LAST_UPDT_PNTTM")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public ServerEqpmnRelate(String serverId, String serverEqpmnId, String lastUpdusrId) {
        this.serverId = serverId;
        this.serverEqpmnId = serverEqpmnId;
        this.lastUpdusrId = lastUpdusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}