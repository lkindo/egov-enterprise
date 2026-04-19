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
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NEVENTINFO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class EventInfo extends BaseEntity {

    @Id
    @Column(name = "EVENT_ID", length = 20)
    private String eventId;

    @Column(name = "BSNS_YEAR", length = 4)
    private String bsnsYear;

    @Column(name = "BSNS_CODE", length = 20)
    private String bsnsCode;

    @Column(name = "EVENT_CN", length = 2500)
    private String eventCn;

    @Column(name = "EVENT_SVC_BGNDE", length = 20)
    private String eventSvcBgnde;

    @Column(name = "EVENT_SVC_ENDDE", length = 20)
    private String eventSvcEndde;

    @Column(name = "SVC_USE_NMPR_CO")
    private Long svcUseNmprCo;

    @Column(name = "CHARGER_NM", length = 60)
    private String chargerNm;

    @Column(name = "PRPARETG_CN", length = 2500)
    private String prparetgCn;

    @Column(name = "EVENT_TY_CODE", length = 20)
    private String eventTyCode;

    @Column(name = "EVENT_CONFM_AT", length = 1)
    private String eventConfmAt;

    @Column(name = "EVENT_CONFM_DE", length = 20)
    private String eventConfmDe;
}
