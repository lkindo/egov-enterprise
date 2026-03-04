package com.company.project.domain.system;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ServerEqpmnRelateId implements Serializable {
    private String serverId;
    private String serverEqpmnId;
}