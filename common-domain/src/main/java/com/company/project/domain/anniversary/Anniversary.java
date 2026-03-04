package com.company.project.domain.anniversary;

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
 * 疫꿸퀡????類ｋ궖 Entity
 * ??뉕탢?????뵠?? NANNVRSRYMANAGE
 */
@Entity(name = "DomainAnniversary")
@Table(name = "NANNVRSRYMANAGE")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Anniversary extends BaseEntity {

    @Id
    @Column(name = "ANNVRSRY_ID", length = 20)
    private String annId;

    @Column(name = "USER_ID", length = 20, nullable = false)
    private String usid;

    @Column(name = "ANNVRSRY_SE", length = 2)
    private String annvrsrySe;

    @Column(name = "ANNVRSRY_NM", length = 255, nullable = false)
    private String annvrsryNm;

    @Column(name = "ANNVRSRY", length = 20, nullable = false)
    private String annvrsryDe;

    @Column(name = "CLDR_SE", length = 1)
    private String cldrSe;

    @Column(name = "ANNVRSRY_NTCN_SETUP", length = 1)
    private String annvrsrySetup;

    @Column(name = "ANNVRSRY_NTCN_BGNDE", length = 20)
    private String annvrsryBeginDe;

    @Column(name = "MEMO", columnDefinition = "TEXT")
    private String memo;

    @Column(name = "REPTIT_AT", length = 1)
    private String reptitAt;

    @Builder
    public Anniversary(String annId, String usid, String annvrsrySe, String annvrsryNm, String annvrsryDe,
            String cldrSe, String annvrsrySetup, String annvrsryBeginDe, String memo, String reptitAt) {
        this.annId = annId;
        this.usid = usid;
        this.annvrsrySe = annvrsrySe;
        this.annvrsryNm = annvrsryNm;
        this.annvrsryDe = annvrsryDe;
        this.cldrSe = cldrSe;
        this.annvrsrySetup = annvrsrySetup;
        this.annvrsryBeginDe = annvrsryBeginDe;
        this.memo = memo;
        this.reptitAt = reptitAt;
    }

    public void update(String annvrsrySe, String annvrsryNm, String annvrsryDe, String cldrSe,
            String annvrsrySetup, String annvrsryBeginDe, String memo, String reptitAt) {
        this.annvrsrySe = annvrsrySe;
        this.annvrsryNm = annvrsryNm;
        this.annvrsryDe = annvrsryDe;
        this.cldrSe = cldrSe;
        this.annvrsrySetup = annvrsrySetup;
        this.annvrsryBeginDe = annvrsryBeginDe;
        this.memo = memo;
        this.reptitAt = reptitAt;
    }
}