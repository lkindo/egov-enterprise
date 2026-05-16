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
    @Column(name = "ADBK_CONSTNT_ID", length = 20)
    private String adbkUserId;

    @Column(name = "ADBK_ID", length = 20, nullable = false)
    private String adbkId;

    @Column(name = "USER_ID", length = 30)
    private String userId;

    @Column(name = "RLS_SCP_CD", length = 30)
    private String rlsScpCd;

    @Column(name = "NM", length = 50)
    private String userNm;

    @Column(name = "EML_ADDR", length = 300)
    private String emlAddr;

    @Column(name = "HOME_TELNO", length = 20)
    private String homeTelno;

    @Column(name = "MBL_TELNO", length = 20)
    private String mblTelno;

    @Column(name = "OFC_TELNO", length = 20)
    private String officeTelno;

    @Column(name = "FAX_NO", length = 20)
    private String faxNo;
}
