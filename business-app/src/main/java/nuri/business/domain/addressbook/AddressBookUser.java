package nuri.business.domain.addressbook;
import nuri.foundation.domain.common.BaseEntity;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long adbkMbrSn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adbk_sn", nullable = false)
    private AddressBook addressBook;

    @Column(length = 20)
    private String userId;




    @Column(length = 100)
    private String nm;

    @Column(length = 320)
    private String emlAddr;

    @Column(length = 11)
    private String homeTelno;

    @Column(length = 11)
    private String mblTelno;

    @Column(length = 11)
    private String ofcTelno;

    @Column(length = 20)
    private String faxNo;


    /**
     * 전체 필드 초기화 생성자 (정적 팩토리 create() 전용).
     * 감사 필드(frstRgtrId/lastMdfrId 등)는 JPA Auditing 이 채우므로 제외.
     */
    private AddressBookUser(Long adbkMbrSn, AddressBook addressBook, String userId,
                            String nm, String emlAddr, String homeTelno, String mblTelno,
                            String ofcTelno, String faxNo) {
        this.adbkMbrSn = adbkMbrSn;
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
    public static AddressBookUser create(Long adbkMbrSn, AddressBook addressBook, String userId,
                                         String nm, String emlAddr, String homeTelno, String mblTelno,
                                         String ofcTelno, String faxNo) {
        return new AddressBookUser(adbkMbrSn, addressBook, userId, nm, emlAddr,
                homeTelno, mblTelno, ofcTelno, faxNo);
    }

    /**
     * 구성원 연락 정보 갱신.
     *
     * <p>[2026-08-28] 종전에는 갱신 경로가 없었다. {@code AddressBookService.updateAddressBook} 이
     * 같은 {@code userId} 를 만나면 <b>조용히 건너뛰어</b>, 이메일·연락처를 바꿔 보내도 아무 일이
     * 일어나지 않았다(요청은 200 이라 화면은 저장된 줄 안다).
     *
     * <p>{@code userId} 는 소속 판정 키라 여기서 바꾸지 않는다 — 바꾸려면 제거 후 추가다.
     */
    public void updateContact(String nm, String emlAddr, String homeTelno, String mblTelno,
                              String ofcTelno, String faxNo) {
        this.nm = nm;
        this.emlAddr = emlAddr;
        this.homeTelno = homeTelno;
        this.mblTelno = mblTelno;
        this.ofcTelno = ofcTelno;
        this.faxNo = faxNo;
    }

}
