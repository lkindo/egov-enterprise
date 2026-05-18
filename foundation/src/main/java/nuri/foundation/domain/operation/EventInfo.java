package nuri.foundation.domain.operation;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 행사 정보 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 * [Modernization] DB character varying(20) 스키마의 8자리 날짜 문자열 데이터와 맞추기 위해 String 타입으로 타입 강건화(Hardening)
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "TB_EVENT_INFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class EventInfo extends BaseEntity {

    @Id
    @Column(name = "EVNT_ID", length = 20)
    private String eventId;

    @Column(name = "BIZ_YR", length = 4)
    private String bsnsYear;

    @Column(name = "BIZ_CD", length = 20)
    private String bsnsCode;

    @Column(name = "EVNT_CN", length = 2500)
    private String eventCn;

    @Column(name = "EVNT_BGNG_YMD", length = 20)
    private String eventSvcBgnde;

    @Column(name = "EVNT_END_YMD", length = 20)
    private String eventSvcEndde;

    @Column(name = "EVNT_USE_CNT")
    private Long svcUseNmprCo;

    @Column(name = "PIC_NM", length = 60)
    private String chargerNm;

    @Column(name = "PREP_MTTR", length = 2500)
    private String prparetgCn;

    @Column(name = "EVNT_TYPE_CD", length = 20)
    private String eventTyCode;

    @Column(name = "EVNT_APRV_YN", length = 1)
    private String eventConfmAt;

    @Column(name = "EVNT_APRV_YMD", length = 20)
    private String eventConfmDe;
}
