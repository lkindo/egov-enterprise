package com.company.project.domain.system;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "NNTWRKINFO")
public class Ntwrk extends BaseEntity {

    @Id
    @Column(name = "NTWRK_ID", length = 20)
    private String ntwrkId;

    @Column(name = "NTWRK_IP", length = 23)
    private String ntwrkIp;

    @Column(name = "GTWY", length = 23)
    private String gtwy;

    @Column(name = "SUBNET", length = 23)
    private String subnet;

    @Column(name = "DOMN_NM_SERVER", length = 23)
    private String domnServer;

    @Column(name = "MANAGE_IEM", length = 2)
    private String manageIem;

    @Column(name = "USER_NM", length = 60)
    private String userNm;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Column(name = "RGSDE")
    private LocalDate regstYmd;

    // Missing method for compatibility
    public String getFrstRegisterId() {
        return this.getCreatedBy();
    }

    public void setFrstRegisterId(String frstRegisterId) {
        this.setCreatedBy(frstRegisterId);
    }
}