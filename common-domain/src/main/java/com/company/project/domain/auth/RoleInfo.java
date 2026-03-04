package com.company.project.domain.auth;

import jakarta.persistence.*;
import lombok.*;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NROLEINFO")
public class RoleInfo {

    @Id
    @Column(name = "ROLE_CODE", length = 50)
    private String roleCode;

    @Column(name = "ROLE_NM", nullable = false, length = 60)
    private String roleNm;

    @Column(name = "ROLE_PTTRN", length = 300)
    private String rolePttrn;

    @Column(name = "ROLE_DC", length = 200)
    private String roleDc;

    @Column(name = "ROLE_TY", length = 80)
    private String roleTy;

    @Column(name = "ROLE_SORT", length = 10)
    private String roleSort;

    @Column(name = "ROLE_CREAT_DE", length = 20)
    private String creatDt;

    @Builder
    public RoleInfo(String roleCode, String roleNm, String rolePttrn, String roleDc, String roleTy, String roleSort) {
        this.roleCode = roleCode;
        this.roleNm = roleNm;
        this.rolePttrn = rolePttrn;
        this.roleDc = roleDc;
        this.roleTy = roleTy;
        this.roleSort = roleSort;
        this.creatDt = java.time.LocalDate.now().toString().replace("-", "");
    }

    /**
     * Updates the role information.
     *
     * @param roleNm    Role Name
     * @param rolePttrn Role Pattern
     * @param roleDc    Role Description
     * @param roleTy    Role Type
     * @param roleSort  Role Sort Order
     */
    public void update(String roleNm, String rolePttrn, String roleDc, String roleTy, String roleSort) {
        this.roleNm = roleNm;
        this.rolePttrn = rolePttrn;
        this.roleDc = roleDc;
        this.roleTy = roleTy;
        this.roleSort = roleSort;
    }
}