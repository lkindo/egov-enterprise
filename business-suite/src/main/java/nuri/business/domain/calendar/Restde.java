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
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_hldy_info")
public class Restde extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "hldy_sn")
    private Integer restdeNo;

    @Column(name = "hldy_ymd", length = 8)
    private String restdeDe;

    @Column(name = "hldy_nm", length = 100)
    private String restdeNm;

    @Column(name = "hldy_expln", length = 4000)
    private String restdeDc;

    @Column(name = "hldy_se_cd", length = 12)
    private String restdeSeCode;

    public void update(String restdeDe, String restdeNm, String restdeDc, String restdeSeCode) {
        this.restdeDe = restdeDe;
        this.restdeNm = restdeNm;
        this.restdeDc = restdeDc;
        this.restdeSeCode = restdeSeCode;
    }

    // standard aliases
    public String getRestdeYmd() { return restdeDe; }
    public String getRestdeExpln() { return restdeDc; }
    public String getRestdeSeCd() { return restdeSeCode; }
}
