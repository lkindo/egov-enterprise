package nuri.business.domain.addressbook;
import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.AllArgsConstructor;
import lombok.experimental.SuperBuilder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 주소록 구성원 정보를 관리하는 JPA Entity
 * 테이블명: COMTNADBK (레거시), NADBK (신규)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_ADBK_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class AddressBookUser extends BaseEntity {

    @Id
    @Column(name = "adbk_constnt_id", length = 20)
    private String adbkUserId;

    @Column(name = "adbk_id", length = 20, nullable = false)
    private String adbkId;

    @Column(name = "emplyr_id", length = 20)
    private String emplyrId;

    @Column(name = "nm", length = 50)
    private String nm;

    @Column(name = "EML_ADDR", length = 50)
    private String emailAdres;

    @Column(name = "HOME_TELNO", length = 20)
    private String homeTelno;

    @Column(name = "MBL_TELNO", length = 20)
    private String moblphonNo;

    @Column(name = "OFC_TELNO", length = 20)
    private String offmTelno;

    @Column(name = "FXNO", length = 20)
    private String fxnum;
}
