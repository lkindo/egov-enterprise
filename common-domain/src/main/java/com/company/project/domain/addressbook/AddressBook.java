package com.company.project.domain.addressbook;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 주소록 JPA Entity
 * 레거시 테이블: COMTNADBKINFO
 */
@Entity
@Table(name = "nadbkmanage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AddressBook {

    @Id
    @Column(name = "adbk_id", length = 20)
    private String adbkId;

    @Column(name = "adbk_nm", length = 100, nullable = false)
    private String adbkNm;

    @Column(name = "othbc_scope", length = 20)
    private String othbcScope;

    @Column(name = "trget_orgnzt_id", length = 20)
    private String trgetOrgnztId;

    @Column(name = "use_at", length = 1)
    private String useAt;

    @Column(name = "wrter_id", length = 20)
    private String wrterId;

    @Column(name = "frst_register_id", length = 20)
    private String frstRegisterId;

    @Column(name = "frst_regist_pnttm")
    private LocalDateTime frstRegisterPnttm;

    @Column(name = "last_updusr_id", length = 20)
    private String lastUpdusrId;

    @Column(name = "last_updt_pnttm")
    private LocalDateTime lastUpdusrPnttm;

    @Builder
    public AddressBook(String adbkId, String adbkNm, String othbcScope, String trgetOrgnztId,
            String useAt, String wrterId, String frstRegisterId) {
        this.adbkId = adbkId;
        this.adbkNm = adbkNm;
        this.othbcScope = othbcScope;
        this.trgetOrgnztId = trgetOrgnztId;
        this.useAt = useAt;
        this.wrterId = wrterId;
        this.frstRegisterId = frstRegisterId;
        this.frstRegisterPnttm = LocalDateTime.now();
    }

    public void update(String adbkNm, String othbcScope, String useAt, String updusrId) {
        this.adbkNm = adbkNm;
        this.othbcScope = othbcScope;
        this.useAt = useAt;
        this.lastUpdusrId = updusrId;
        this.lastUpdusrPnttm = LocalDateTime.now();
    }
}
