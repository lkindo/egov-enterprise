package nuri.business.domain.calendar;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 휴일 정보 엔티티
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_HLDY_INFO")
public class Restde extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "RESTDE_NO")
    private Integer restdeNo;

    @Column(name = "HLDY_YMD", length = 8)
    private String restdeDe;

    @Column(name = "HLDY_NM", length = 60)
    private String restdeNm;

    @Column(name = "HLDY_EXPLN", length = 200)
    private String restdeDc;

    @Column(name = "HLDY_SE_CD", length = 1)
    private String restdeSeCode;

    public void update(String restdeDe, String restdeNm, String restdeDc, String restdeSeCode) {
        this.restdeDe = restdeDe;
        this.restdeNm = restdeNm;
        this.restdeDc = restdeDc;
        this.restdeSeCode = restdeSeCode;
    }
}
