package nuri.business.domain.addressbook;
import nuri.business.domain.common.BaseEntity;
import lombok.Builder;

import jakarta.persistence.*;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 주소록 구성원 정보를 관리하는 JPA Entity
 * 테이블명: COMTNADBK (레거시), NADBK (신규)
 */
@Entity
@Table(name = "tb_adbk_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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


    /**
     * 전체 필드 초기화 생성자 (정적 팩토리 create() 전용).
     * 감사 필드(frstRgtrId/lastMdfrId 등)는 JPA Auditing 이 채우므로 제외.
     */
    private AddressBookUser(String adbkConstntId, AddressBook addressBook, String userId,
                            String nm, String emlAddr, String homeTelno, String mblTelno,
                            String ofcTelno, String faxNo) {
        this.adbkConstntId = adbkConstntId;
        this.addressBook = addressBook;
        this.userId = userId;
        this.nm = nm;
        this.emlAddr = emlAddr;
        this.homeTelno = homeTelno;
        this.mblTelno = mblTelno;
        this.ofcTelno = ofcTelno;
        this.faxNo = faxNo;
    }

    /**
     * 빌더 기반 정적 팩토리.
     * 기존 AddressBookUser.builder()...build() 호출부 호환을 유지한다.
     */
    @Builder
    public static AddressBookUser create(String adbkConstntId, AddressBook addressBook, String userId,
                                         String nm, String emlAddr, String homeTelno, String mblTelno,
                                         String ofcTelno, String faxNo) {
        return new AddressBookUser(adbkConstntId, addressBook, userId, nm, emlAddr,
                homeTelno, mblTelno, ofcTelno, faxNo);
    }

}
