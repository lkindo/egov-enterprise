package com.company.project.domain.log;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserLogId implements Serializable {
    private String occrrncDe;
    private String rqesterId;
    private String srvcNm;
    private String methodNm;
}