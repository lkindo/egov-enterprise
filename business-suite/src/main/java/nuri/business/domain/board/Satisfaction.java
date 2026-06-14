package nuri.business.domain.board;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import lombok.Builder;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_dgstfn_info")
@EntityListeners(org.springframework.data.jpa.domain.support.AuditingEntityListener.class)
@SuperBuilder
public class Satisfaction extends BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "stsfdgIdSeq")
    @SequenceGenerator(name = "stsfdgIdSeq", sequenceName = "sq_dgstfn_sn", allocationSize = 1)
        private Long dgstfnSn;

    @Column(nullable = false, length = 20)
    private String bbsId;

    @Column(nullable = false, length = 20)
    private String pstId;

    @Column(nullable = false)
    private Integer dgstfnScr;

    @Column(length = 4000)
    private String dgstfnCn;

    @Column(length = 200)
    private String pswd;

    @Builder.Default
    @Column(length = 1)
    private String useYn = "Y";

    @Column(length = 20)
    private String userId;

    @Column(length = 100)
    private String userNm;

    public void update(Integer dgstfnScr, String dgstfnCn, String password) {
        this.dgstfnScr = dgstfnScr;
        this.dgstfnCn = dgstfnCn;
        if (password != null && !password.isEmpty()) {
            this.pswd = password;
        }
    }

    public void delete() {
        this.useYn = "N";
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
