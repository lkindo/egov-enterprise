package com.company.project.domain.addressbook;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 雅뚯눘?쇗에??닌딄쉐??JPA Entity
 * ??뉕탢?????뵠?? COMTNADBK
 */
@Entity
@Table(name = "NADBK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AddressBookUser {

    @Id
    @Column(name = "adbk_constnt_id", length = 20)
    private String adbkUserId;

    @Column(name = "adbk_id", length = 20, nullable = false)
    private String adbkId;

    @Column(name = "emplyr_id", length = 20)
    private String emplyrId;

    @Column(name = "ncrd_id", length = 20)
    private String ncrdId;

    @Column(name = "nm", length = 50)
    private String nm;

    @Column(name = "email_adres", length = 50)
    private String emailAdres;

    @Column(name = "house_telno", length = 20)
    private String homeTelno;

    @Column(name = "mbtlnum", length = 20)
    private String moblphonNo;

    @Column(name = "offm_telno", length = 20)
    private String offmTelno;

    @Column(name = "fxnum", length = 20)
    private String fxnum;

    @Builder
    public AddressBookUser(String adbkUserId, String adbkId, String emplyrId, String ncrdId, String nm,
            String emailAdres, String homeTelno, String moblphonNo, String offmTelno, String fxnum) {
        this.adbkUserId = adbkUserId;
        this.adbkId = adbkId;
        this.emplyrId = emplyrId;
        this.ncrdId = ncrdId;
        this.nm = nm;
        this.emailAdres = emailAdres;
        this.homeTelno = homeTelno;
        this.moblphonNo = moblphonNo;
        this.offmTelno = offmTelno;
        this.fxnum = fxnum;
    }
}
