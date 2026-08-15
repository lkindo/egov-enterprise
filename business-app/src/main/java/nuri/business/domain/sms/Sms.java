package nuri.business.domain.sms;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * SMS 발송 정보 엔티티.
 * 매핑 테이블: {@code tb_sms_info}
 */
@Entity
@Table(name = "tb_sms_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Sms extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sms_trsm_sn")
    private Long smsTrsmSn;

    @Column(length = 13, nullable = false)
    private String sndngTelno;

    @Column(length = 4000)
    private String sndngCn;

    private Sms(String sndngTelno, String sndngCn) {
        this.sndngTelno = sndngTelno;
        this.sndngCn = sndngCn;
    }

    /** DB 생성 일련번호를 입력받지 않는 신규 SMS 팩토리. */
    @Builder
    public static Sms create(String sndngTelno, String sndngCn) {
        return new Sms(sndngTelno, sndngCn);
    }
}
