package nuri.business.domain.system.content.community;

import nuri.business.domain.common.BaseEntity;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import java.io.Serializable;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "tb_cmnty_user_map")
public class CommunityUser extends BaseEntity implements Serializable {

    @EmbeddedId
    private CommunityUserId id;

    @Column(length = 1)
    private String mngrYn;

    @Column(length = 8)
    private String joinYmd;

    @Column(length = 8)
    private String whdwlYmd;

    @Column(length = 12)
    private String mbrSttsCd;

    @Column(length = 1)
    private String useYn;

    private CommunityUser(CommunityUserId id, String mngrYn, String joinYmd, String whdwlYmd, String mbrSttsCd, String useYn) {
        this.id = id;
        this.mngrYn = mngrYn;
        this.joinYmd = joinYmd;
        this.whdwlYmd = whdwlYmd;
        this.mbrSttsCd = mbrSttsCd;
        this.useYn = useYn;
    }

    @Builder
    public static CommunityUser create(CommunityUserId id, String mngrYn, String joinYmd, String whdwlYmd, String mbrSttsCd, String useYn) {
        return new CommunityUser(id, mngrYn, joinYmd, whdwlYmd, mbrSttsCd, useYn);
    }

    public void approve() {
        this.mbrSttsCd = "P"; // Example status for approved
    }

    public void withdraw() {
        this.useYn = "N";
        this.whdwlYmd = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        this.mngrYn = "N";
    }

    public void grantAdmin() {
        this.mngrYn = "Y";
    }

    public void revokeAdmin() {
        this.mngrYn = "N";
    }
}
