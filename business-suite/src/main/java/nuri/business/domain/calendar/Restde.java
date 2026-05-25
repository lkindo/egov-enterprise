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
    @com.fasterxml.jackson.annotation.JsonProperty("restdeNo")
    private Integer hldySn;

    @Column(length = 8)
    @com.fasterxml.jackson.annotation.JsonProperty("restdeDe")
    private String hldyYmd;

    @Column(length = 100)
    @com.fasterxml.jackson.annotation.JsonProperty("restdeNm")
    private String hldyNm;

    @Column(length = 4000)
    @com.fasterxml.jackson.annotation.JsonProperty("restdeDc")
    private String hldyExpln;

    @Column(length = 12)
    @com.fasterxml.jackson.annotation.JsonProperty("restdeSeCode")
    private String hldySeCd;

    public void update(String restdeDe, String restdeNm, String restdeDc, String restdeSeCode) {
        this.hldyYmd = restdeDe;
        this.hldyNm = restdeNm;
        this.hldyExpln = restdeDc;
        this.hldySeCd = restdeSeCode;
    }

    // ----- [Legacy Getter/Setter & Builder Aliases] -----

    public Integer getRestdeNo() { return this.hldySn; }
    public void setRestdeNo(Integer v) { this.hldySn = v; }

    public String getRestdeDe() { return this.hldyYmd; }
    public void setRestdeDe(String v) { this.hldyYmd = v; }

    public String getRestdeNm() { return this.hldyNm; }
    public void setRestdeNm(String v) { this.hldyNm = v; }

    public String getRestdeDc() { return this.hldyExpln; }
    public void setRestdeDc(String v) { this.hldyExpln = v; }

    public String getRestdeSeCode() { return this.hldySeCd; }
    public void setRestdeSeCode(String v) { this.hldySeCd = v; }

    public String getRestdeYmd() { return this.hldyYmd; }
    public String getRestdeExpln() { return this.hldyExpln; }
    public String getRestdeSeCd() { return this.hldySeCd; }

    public static abstract class RestdeBuilder<C extends Restde, B extends RestdeBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private Integer hldySn;
        private String hldyYmd;
        private String hldyNm;
        private String hldyExpln;
        private String hldySeCd;

        public B restdeNo(Integer restdeNo) {
            this.hldySn = restdeNo;
            return self();
        }
        public B restdeDe(String restdeDe) {
            this.hldyYmd = restdeDe;
            return self();
        }
        public B restdeNm(String restdeNm) {
            this.hldyNm = restdeNm;
            return self();
        }
        public B restdeDc(String restdeDc) {
            this.hldyExpln = restdeDc;
            return self();
        }
        public B restdeSeCode(String restdeSeCode) {
            this.hldySeCd = restdeSeCode;
            return self();
        }
    }
}
