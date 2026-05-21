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
@Table(name = "tb_adbk_info")
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

    @Column(name = "user_id", length = 20)
    private String userId;

    // @Column(name = "rls_scp_cd", length = 30)
    // private String rlsScpCd;

    @Column(name = "nm", length = 100)
    private String userNm;

    @Column(name = "eml_addr", length = 50)
    private String emlAddr;

    @Column(name = "home_telno", length = 11)
    private String homeTelno;

    @Column(name = "mbl_telno", length = 11)
    private String mblTelno;

    @Column(name = "ofc_telno", length = 11)
    private String officeTelno;

    @Column(name = "fax_no", length = 11)
    private String faxNo;
}
