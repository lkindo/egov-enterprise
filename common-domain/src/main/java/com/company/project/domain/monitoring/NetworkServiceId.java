package com.company.project.domain.monitoring;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode
public class NetworkServiceId implements Serializable {

    @Column(name = "SYS_IP", length = 23)
    private String sysIp;

    @Column(name = "SYS_PORT")
    private Integer sysPort;
}