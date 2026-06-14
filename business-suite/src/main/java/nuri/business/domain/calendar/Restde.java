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

public class Restde extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Integer hldySn;

    @Column(length = 8)
    private String hldyYmd;

    @Column(length = 100)
    private String hldyNm;

    @Column(length = 4000)
    private String hldyExpln;

    @Column(length = 12)
    private String hldySeCd;

    public void update(String hldyYmd, String hldyNm, String hldyExpln, String hldySeCd) {
        validateDateFormat(hldyYmd);
        this.hldyYmd = hldyYmd;
        this.hldyNm = hldyNm;
        this.hldyExpln = hldyExpln;
        this.hldySeCd = hldySeCd;
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
    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
