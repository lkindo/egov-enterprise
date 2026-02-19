package com.company.project.domain.user.entity;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ???????) ??? Entity
 * ?????????? NORGNZTINFO
 */
@Entity
@Table(name = "NORGNZTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeptManage extends BaseEntity {

    @Id
    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "ORGNZT_NM", length = 100, nullable = false)
    private String orgnztNm;

    @Column(name = "ORGNZT_DC", length = 255)
    private String orgnztDc;

    @Builder
    public DeptManage(String orgnztId, String orgnztNm, String orgnztDc) {
        this.orgnztId = orgnztId;
        this.orgnztNm = orgnztNm;
        this.orgnztDc = orgnztDc;
    }

    public void update(String orgnztNm, String orgnztDc) {
        this.orgnztNm = orgnztNm;
        this.orgnztDc = orgnztDc;
    }
}
