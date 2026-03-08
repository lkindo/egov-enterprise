package com.company.project.domain.system.monitoring;

import lombok.*;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class NtwrkSvcMntrngId implements Serializable {
    private String sysIp;
    private Integer sysPort;
}
