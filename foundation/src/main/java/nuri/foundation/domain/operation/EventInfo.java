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
@Table(name = "tb_event_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class EventInfo extends BaseEntity {

    @Id
    @Column(name = "evnt_id", length = 20)
    private String eventId;

    @Column(name = "biz_yr", length = 4)
    private String bsnsYear;

    @Column(name = "biz_cd", length = 20)
    private String bsnsCode;

    @Column(name = "evnt_cn", length = 2500)
    private String eventCn;

    @Column(name = "evnt_bgng_ymd", length = 20)
    private String eventSvcBgnde;

    @Column(name = "evnt_end_ymd", length = 20)
    private String eventSvcEndde;

    @Column(name = "evnt_use_cnt")
    private Long svcUseNmprCo;

    @Column(name = "pic_nm", length = 60)
    private String chargerNm;

    @Column(name = "prep_mttr", length = 2500)
    private String prparetgCn;

    @Column(name = "evnt_type_cd", length = 20)
    private String eventTyCode;

    @Column(name = "evnt_aprv_yn", length = 1)
    private String eventConfmAt;

    @Column(name = "evnt_aprv_ymd", length = 20)
    private String eventConfmDe;
}
