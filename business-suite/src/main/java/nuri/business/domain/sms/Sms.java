package nuri.business.domain.sms;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * SMS JPA Entity
 * 매핑 테이블: NSMS
 */
@Entity
@Table(name = "tb_sms_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sms extends BaseEntity {

    @Id
    @Column(length = 20)
    private String smsId;

    @Column(length = 13, nullable = false)
    private String sndngTelno;

    @Column(length = 4000)
    private String sndngCn;

    // 레거시 별칭 완전 철폐 (표준화 동기화)

    // 팩토리 위임용 생성자 (own 필드 전체)
    private Sms(String smsId, String sndngTelno, String sndngCn) {
        this.smsId = smsId;
        this.sndngTelno = sndngTelno;
        this.sndngCn = sndngCn;
    }

    /**
     * 정적 팩토리 빌더. 기존 Sms.builder()...build() 호출부와 100% 호환.
     */
    @Builder
    public static Sms create(String smsId, String sndngTelno, String sndngCn) {
        return new Sms(smsId, sndngTelno, sndngCn);
    }
}
