package com.company.project.domain.duty;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 당직 정보 Entity
 * 레거시 테이블: NBNDTMANAGE
 */
@Entity
@Table(name = "NBNDTMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(BndtManageId.class)
public class BndtManage extends BaseEntity {

    @Id
    @Column(name = "BNDT_ID", length = 20)
    private String bndtId;

    @Id
    @Column(name = "BNDT_DE", length = 8)
    private String bndtDe;

    @Column(name = "RM", length = 255)
    private String remark;

    @Builder
    public BndtManage(String bndtId, String bndtDe, String remark) {
        this.bndtId = bndtId;
        this.bndtDe = bndtDe;
        this.remark = remark;
    }

    public void update(String remark) {
        this.remark = remark;
    }
}
