package com.company.project.domain.namecard;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 명함 JPA Entity
 * 연계 테이블: NNCRD
 */
@Entity
@Table(name = "NNCRD")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NameCard extends BaseEntity {

    @Id
    @Column(name = "NCRD_ID", length = 20)
    private String ncrdId;

    @Column(name = "NM", length = 100, nullable = false)
    private String name;

    @Column(name = "CMPNY_NM", length = 100)
    private String companyName;

    @Column(name = "DEPT_NM", length = 100)
    private String departmentName;

    @Column(name = "CLSF_NM", length = 50)
    private String rankName;

    @Column(name = "OFCPS_NM", length = 50)
    private String positionName;

    @Column(name = "EMAIL_ADRES", length = 100)
    private String emailAddress;

    @Column(name = "TELNO", length = 20)
    private String telNumber;

    @Column(name = "MBTLNUM", length = 20)
    private String mobileNumber;

    @Column(name = "ADRES", length = 255)
    private String address;

    @Column(name = "DETAIL_ADRES", length = 255)
    private String detailAddress;

    @Transient
    private String zipCode;

    @Column(name = "RM", length = 500)
    private String remark;

    @Column(name = "OTHBC_AT", length = 1)
    private String isPublic;

    @Column(name = "NCRD_TRGTER_ID", length = 20)
    private String targetUserId;

    @Column(name = "EXTRL_USER_AT", length = 1)
    private String isExternalUser;

    @Builder
    public NameCard(String ncrdId, String name, String companyName, String departmentName, String rankName,
            String positionName, String emailAddress, String telNumber, String mobileNumber, String address,
            String detailAddress, String zipCode, String remark, String isPublic,
            String targetUserId, String isExternalUser) {
        this.ncrdId = ncrdId;
        this.name = name;
        this.companyName = companyName;
        this.departmentName = departmentName;
        this.rankName = rankName;
        this.positionName = positionName;
        this.emailAddress = emailAddress;
        this.telNumber = telNumber;
        this.mobileNumber = mobileNumber;
        this.address = address;
        this.detailAddress = detailAddress;
        this.zipCode = zipCode;
        this.remark = remark;
        this.isPublic = isPublic;
        this.targetUserId = targetUserId;
        this.isExternalUser = isExternalUser;
    }

    public void update(String name, String companyName, String departmentName, String rankName, String positionName,
            String emailAddress, String telNumber, String mobileNumber, String address, String detailAddress,
            String zipCode, String remark, String isPublic, String isExternalUser) {
        this.name = name;
        this.companyName = companyName;
        this.departmentName = departmentName;
        this.rankName = rankName;
        this.positionName = positionName;
        this.emailAddress = emailAddress;
        this.telNumber = telNumber;
        this.mobileNumber = mobileNumber;
        this.address = address;
        this.detailAddress = detailAddress;
        this.zipCode = zipCode;
        this.remark = remark;
        this.isPublic = isPublic;
        this.isExternalUser = isExternalUser;
    }
}