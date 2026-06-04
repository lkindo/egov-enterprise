package nuri.business.domain.addressbook;
 
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 주소록 정보 JPA Entity
 * 테이블명: TB_ADBK_MANAGE
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_adbk_manage")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder

public class AddressBook extends BaseEntity {

    @lombok.Builder.Default
    @OneToMany(mappedBy = "addressBook", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<AddressBookUser> addressBookUsers = new java.util.ArrayList<>();

    @Id
    @Column(name = "adbk_id", length = 20)
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

    @Column(name = "trget_ognz_id", length = 20)
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

    // legacy
    public String getUseAt() { return useYn; }
    public void setUseAt(String v) { this.useYn = v; }
}
