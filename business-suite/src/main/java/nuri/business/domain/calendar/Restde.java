package nuri.business.domain.calendar;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
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
@AttributeOverrides({
    @AttributeOverride(name = "createdBy", column = @Column(name = "frst_rgtr_id", updatable = false, length = 20)),
    @AttributeOverride(name = "lastModifiedBy", column = @Column(name = "last_mdfr_id", length = 20)),
    @AttributeOverride(name = "crtDt", column = @Column(name = "crt_dt", updatable = false)),
    @AttributeOverride(name = "mdfcnDt", column = @Column(name = "mdfcn_dt"))
})
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
        validateDateFormat(restdeDe);
        this.hldyYmd = restdeDe;
        this.hldyNm = restdeNm;
        this.hldyExpln = restdeDc;
        this.hldySeCd = restdeSeCode;
    }

    private void validateDateFormat(String ymd) {
        if (ymd == null || ymd.length() != 8) {
            throw new nuri.foundation.core.exception.BusinessException(
                "날짜 형식은 8자리 YYYYMMDD 여야 합니다.", nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
        try {
            java.time.format.DateTimeFormatter.BASIC_ISO_DATE.parse(ymd);
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException(
                "유효하지 않은 날짜 형식입니다: " + ymd, nuri.foundation.core.exception.ErrorCode.INVALID_INPUT_VALUE);
        }
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
