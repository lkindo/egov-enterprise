package com.company.project.domain.system;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class ImgTempId implements Serializable {

    @Column(name = "ORGNZT_CODE", length = 10)
    private String orgCode;

    @Column(name = "ERNCSL_SE", length = 2)
    private String erncslSe;
}
