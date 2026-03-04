package com.company.project.domain.duty;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * ?諭彛???? ?類ｋ궖 Entity
 * ??뉕탢?????뵠?? NBNDTDIARY
 */
@Entity
@Table(name = "NBNDTDIARY")
@IdClass(BndtDiaryId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BndtDiary extends BaseEntity {

    @Id
    @Column(name = "BNDT_ID", length = 20)
    private String bndtId;

    @Id
    @Column(name = "BNDT_DE", length = 8)
    private String bndtDe;

    @Id
    @Column(name = "BNDT_CECK_SE", length = 2)
    private String bndtCeckSe;

    @Id
    @Column(name = "BNDT_CECK_CODE", length = 10)
    private String bndtCeckCd;

    @Column(name = "CHCK_STTUS", length = 1)
    private String chckSttus;

    @Builder
    public BndtDiary(String bndtId, String bndtDe, String bndtCeckSe, String bndtCeckCd, String chckSttus,
            String frstRegisterId) {
        this.bndtId = bndtId;
        this.bndtDe = bndtDe;
        this.bndtCeckSe = bndtCeckSe;
        this.bndtCeckCd = bndtCeckCd;
        this.chckSttus = chckSttus;
        this.createdBy = frstRegisterId;
    }

    public void update(String chckSttus) {
        this.update(chckSttus, null);
    }

    public void update(String chckSttus, String userId) {
        this.chckSttus = chckSttus;
        if (userId != null) {
            this.lastModifiedBy = userId;
        }
    }
}
