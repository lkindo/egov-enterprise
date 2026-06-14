package nuri.business.domain.sms;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * SMS JPA Entity
 * 매핑 테이블: NSMS
 */
@Entity
@Table(name = "tb_sms_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class Sms extends BaseEntity {

    @Id
    @Column(length = 20)
    private String smsId;

    @Column(length = 13, nullable = false)
    private String sndngTelno;

    @Column(length = 4000)
    private String sndngCn;

    // 레거시 별칭 완전 철폐 (표준화 동기화)
}
