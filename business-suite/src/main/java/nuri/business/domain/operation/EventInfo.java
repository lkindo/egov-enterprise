package nuri.business.domain.operation;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 행사 정보 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 * [Modernization] DB character varying(20) 스키마의 8자리 날짜 문자열 데이터와 맞추기 위해 String 타입으로 타입 강건화(Hardening)
 */
@Entity
@Table(name = "tb_event_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    /**
     * [Phase 5.2] 빌더를 정적 팩토리에 배치. 기존 EventInfo.builder()...build() 호출부는 그대로 동작한다.
     * 감사 필드(frstRgtrId/lastMdfrId 등)는 JPA Auditing 이 채우므로 빌더 파라미터에서 제외한다.
     */
    private EventInfo(String evntId, String bizYr, String bizCd, String evntCn,
                      String evntBgngYmd, String evntEndYmd, Long evntUseCnt, String picNm,
                      String prepMttr, String evntTypeCd, String evntAprvYn, String evntAprvYmd) {
        this.evntId = evntId;
        this.bizYr = bizYr;
        this.bizCd = bizCd;
        this.evntCn = evntCn;
        this.evntBgngYmd = evntBgngYmd;
        this.evntEndYmd = evntEndYmd;
        this.evntUseCnt = evntUseCnt;
        this.picNm = picNm;
        this.prepMttr = prepMttr;
        this.evntTypeCd = evntTypeCd;
        this.evntAprvYn = evntAprvYn;
        this.evntAprvYmd = evntAprvYmd;
    }

    @Builder
    public static EventInfo create(String evntId, String bizYr, String bizCd, String evntCn,
                                   String evntBgngYmd, String evntEndYmd, Long evntUseCnt, String picNm,
                                   String prepMttr, String evntTypeCd, String evntAprvYn, String evntAprvYmd) {
        return new EventInfo(evntId, bizYr, bizCd, evntCn, evntBgngYmd, evntEndYmd, evntUseCnt,
                picNm, prepMttr, evntTypeCd, evntAprvYn, evntAprvYmd);
    }
}
