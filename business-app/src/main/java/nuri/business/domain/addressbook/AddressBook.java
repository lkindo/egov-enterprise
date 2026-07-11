package nuri.business.domain.addressbook;
 

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * 주소록 정보 JPA Entity
 * 테이블명: TB_ADBK_MANAGE
 */
@Entity
@Table(name = "tb_adbk_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)

public class AddressBook extends BaseEntity {

    @OneToMany(mappedBy = "addressBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<AddressBookUser> addressBookUsers = new java.util.ArrayList<>();

    @Id
    @Column(length = 20)
    private String adbkId;

    public void addAddressBookUser(AddressBookUser user) {
        this.addressBookUsers.add(user);
        // 빌더 호환 등으로 연관 관계 세팅
        // (AddressBookUser 내 getAddressBook() 혹은 리플렉션/롬복 대응)
    }

    @Column(length = 100, nullable = false)
    private String adbkNm;

    @Column(length = 12)
    private String rlsScopeCd;

    @Column(length = 20)
    private String trgetOgnzId;

    @Column(length = 1)
    private String useYn;

    @Column(length = 20)
    private String wrterId;

    public void update(String adbkNm, String rlsScopeCd, String useYn) {
        this.adbkNm = adbkNm;
        this.rlsScopeCd = rlsScopeCd;
        this.useYn = useYn;
    }

    // Phase 5.2 빌더 규범: @SuperBuilder 제거, 정적 팩토리 create()에 @Builder 배치.
    // 감사 필드(frstRgtrId/lastMdfrId/crtDt/mdfcnDt)는 파라미터에서 제외(Auditing 이 채움).
    private AddressBook(java.util.List<AddressBookUser> addressBookUsers, String adbkId, String adbkNm,
                        String rlsScopeCd, String trgetOgnzId, String useYn, String wrterId) {
        // @Builder.Default 널병합 재현: 컬렉션은 null 이면 새 ArrayList 로 초기화
        this.addressBookUsers = addressBookUsers != null ? addressBookUsers : new java.util.ArrayList<>();
        this.adbkId = adbkId;
        this.adbkNm = adbkNm;
        this.rlsScopeCd = rlsScopeCd;
        this.trgetOgnzId = trgetOgnzId;
        this.useYn = useYn;
        this.wrterId = wrterId;
    }

    @Builder
    public static AddressBook create(java.util.List<AddressBookUser> addressBookUsers, String adbkId, String adbkNm,
                                     String rlsScopeCd, String trgetOgnzId, String useYn, String wrterId) {
        return new AddressBook(addressBookUsers, adbkId, adbkNm, rlsScopeCd, trgetOgnzId, useYn, wrterId);
    }
}
