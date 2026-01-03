package com.company.project.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NSTPLATINFO")
public class TermsInfo {

    @Id
    @Column(name = "USE_STPLAT_ID", length = 20)
    private String useStplatId;

    @Column(name = "USE_STPLAT_CN", columnDefinition = "TEXT")
    private String useStplatCn;

    @Column(name = "INFO_PROVD_AGRE_CN", columnDefinition = "TEXT")
    private String infoProvdAgreCn;
}
