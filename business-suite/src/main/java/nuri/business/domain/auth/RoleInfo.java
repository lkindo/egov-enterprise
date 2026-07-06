package nuri.business.domain.auth;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_role_info")
public class RoleInfo extends BaseEntity {

    @Id
    @Column(name = "role_id", length = 30)
    private String roleId;

    @Column(nullable = false, length = 100)
    private String roleNm;

    @Column(length = 300)
    private String rolePatrn;

    @Column(length = 4000)
    private String roleExpln;

    @Column(length = 12)
    private String roleTypeCd;

    private Integer roleSort;

    private LocalDate roleCrtYmd = LocalDate.now();

    private RoleInfo(String roleId, String roleNm, String rolePatrn, String roleExpln, String roleTypeCd,
                     Integer roleSort, LocalDate roleCrtYmd) {
        this.roleId = roleId;
        this.roleNm = roleNm;
        this.rolePatrn = rolePatrn;
        this.roleExpln = roleExpln;
        this.roleTypeCd = roleTypeCd;
        this.roleSort = roleSort;
        this.roleCrtYmd = roleCrtYmd != null ? roleCrtYmd : LocalDate.now();
    }

    @Builder
    public static RoleInfo create(String roleId, String roleNm, String rolePatrn, String roleExpln, String roleTypeCd,
                                  Integer roleSort, LocalDate roleCrtYmd) {
        return new RoleInfo(roleId, roleNm, rolePatrn, roleExpln, roleTypeCd, roleSort, roleCrtYmd);
    }

    /**
     * Updates the role information.
     *
     * @param roleNm     Role Name
     * @param rolePatrn  Role Pattern
     * @param roleExpln  Role Description
     * @param roleTypeCd Role Type
     * @param roleSort   Role Sort Order
     */
    public void update(String roleNm, String rolePatrn, String roleExpln, String roleTypeCd, Integer roleSort) {
        this.roleNm = roleNm;
        this.rolePatrn = rolePatrn;
        this.roleExpln = roleExpln;
        this.roleTypeCd = roleTypeCd;
        this.roleSort = roleSort;
    }
}
