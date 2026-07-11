package nuri.business.domain.informalsanction;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * 비정형 결재 Entity
 */
@Entity
@Table(name = "tb_ifml_atrz_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InformalSanction extends BaseEntity {

    @Version
    private Integer version;

    @Id
    @Column(length = 20)
    private String ifmlAtrzId;

    @Column(length = 12, nullable = false)
    private String taskSeCd;

    @Column(length = 20, nullable = false)
    private String aplcntId;

    @Column(length = 8)
    private String reqYmd;

    @Column(length = 20, nullable = false)
    private String aprvrId;

    @Column(length = 1)
    private String aprvYn;

    private LocalDateTime atrzDt;

    @Column(length = 4000)
    private String rjctRsnCn;

    // 팩토리 create() 전용 생성자 (선언 순서에 맞춘 비즈니스 필드; 감사 필드/@Version 제외)
    private InformalSanction(String ifmlAtrzId, String taskSeCd, String aplcntId,
                             String reqYmd, String aprvrId, String aprvYn,
                             LocalDateTime atrzDt, String rjctRsnCn) {
        this.ifmlAtrzId = ifmlAtrzId;
        this.taskSeCd = taskSeCd;
        this.aplcntId = aplcntId;
        this.reqYmd = reqYmd;
        this.aprvrId = aprvrId;
        this.aprvYn = aprvYn;
        this.atrzDt = atrzDt;
        this.rjctRsnCn = rjctRsnCn;
    }

    /**
     * 빌더 정적 팩토리 - 기존 InformalSanction.builder()...build() 호출부 호환 유지
     */
    @Builder
    public static InformalSanction create(String ifmlAtrzId, String taskSeCd, String aplcntId,
                                          String reqYmd, String aprvrId, String aprvYn,
                                          LocalDateTime atrzDt, String rjctRsnCn) {
        return new InformalSanction(ifmlAtrzId, taskSeCd, aplcntId, reqYmd, aprvrId, aprvYn, atrzDt, rjctRsnCn);
    }

    public void update(String taskSeCd, String reqYmd, String aprvrId) {
        validateRequestedState();
        validateDateFormat(reqYmd);
        this.taskSeCd = taskSeCd;
        this.reqYmd = reqYmd;
        this.aprvrId = aprvrId;
    }

    /**
     * 승인 처리
     */
    public void approve() {
        validateRequestedState();
        this.aprvYn = SanctionStatus.APPROVED.getCode();
        this.atrzDt = LocalDateTime.now();
        this.rjctRsnCn = null;
    }

    /**
     * 반려 처리
     */
    public void reject(String reason) {
        validateRequestedState();
        if (reason == null || reason.trim().isEmpty()) {
            throw new nuri.foundation.core.exception.BusinessException(
                "반려 사유는 필수입니다.", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        this.aprvYn = SanctionStatus.REJECTED.getCode();
        this.rjctRsnCn = reason;
        this.atrzDt = LocalDateTime.now();
    }

    private void validateRequestedState() {
        if (!SanctionStatus.REQUESTED.getCode().equals(this.aprvYn)) {
            throw new nuri.foundation.core.exception.BusinessException(
                "이미 처리가 완료된 결재 건입니다. (현재 상태: " + SanctionStatus.fromCode(this.aprvYn).getDescription() + ")",
                nuri.foundation.core.exception.CommonErrorCode.INVALID_STATE);
        }
    }


    private void validateDateFormat(String ymd) {
        if (ymd == null || ymd.isEmpty()) {
            return; // null 또는 빈 문자열 허용 (레거시 대응)
        }
        String cleanYmd = ymd.replace("-", "");
        if (cleanYmd.length() != 8) {
            throw new nuri.foundation.core.exception.BusinessException(
                "날짜 형식은 8자리 YYYYMMDD 또는 YYYY-MM-DD 여야 합니다.", nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
        try {
            java.time.format.DateTimeFormatter.BASIC_ISO_DATE.parse(cleanYmd);
        } catch (Exception e) {
            throw new nuri.foundation.core.exception.BusinessException(
                "유효하지 않은 날짜 형식입니다: " + ymd, nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
