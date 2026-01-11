package com.company.project.domain.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "COMTNDEPTINFO")
public class DeptManage {

    @Id
    @Column(name = "ORGNZT_ID", length = 20)
    private String orgnztId;

    @Column(name = "ORGNZT_NM", length = 20)
    private String orgnztNm;

    @Column(name = "ORGNZT_DC", length = 100)
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
