package nuri.business.domain.addressbook;
import nuri.business.domain.common.BaseEntity;
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
    @Column(length = 20)
    private String adbkConstntId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adbk_id", nullable = false)
    private AddressBook addressBook;

    @Column(length = 20)
    private String userId;




    @Column(length = 100)
    private String nm;

    @Column(length = 50)
    private String emlAddr;

    @Column(length = 11)
    private String homeTelno;

    @Column(length = 11)
    private String mblTelno;

    @Column(length = 11)
    private String ofcTelno;

    @Column(length = 11)
    private String faxNo;


}
