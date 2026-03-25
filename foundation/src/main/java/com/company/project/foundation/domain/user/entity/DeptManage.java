package com.company.project.foundation.domain.user.entity;

import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * 부서 정보 Entity
 * 매핑 테이블: NORGNZTINFO
 */
@Entity
@Table(name = "NORGNZTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class DeptManage extends BaseEntity {

    @Id
    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "ORGNZT_NM", length = 100, nullable = false)
    private String orgnztNm;

    @Column(name = "ORGNZT_DC", length = 255)
    private String orgnztDc;

    public void update(String orgnztNm, String orgnztDc) {
        this.orgnztNm = orgnztNm;
        this.orgnztDc = orgnztDc;
    }
}
