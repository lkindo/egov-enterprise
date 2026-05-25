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
    @Column(name = "evnt_id", length = 30)
    private String evntId;

    @Column(length = 4)
    private String bizYr;

    @Column(length = 30)
    private String bizCd;

    @Column(length = 4000)
    private String evntCn;

    @Column(length = 20)
    private String evntBgngYmd;

    @Column(length = 20)
    private String evntEndYmd;

    private Long evntUseCnt;

    @Column(length = 300)
    private String picNm;

    @Column(length = 2500)
    private String prepMttr;

    @Column(length = 30)
    private String evntTypeCd;

    @Column(length = 1)
    private String evntAprvYn;

    @Column(length = 20)
    private String evntAprvYmd;
}
