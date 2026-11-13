package nuri.business.domain.event;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigInteger;

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
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "evnt_sn")
    private Long evntSn;

    /** 낙관적 잠금 버전(V2_149). 화면이 읽은 값과 다르면 다른 사람이 먼저 고친 것이다(서비스가 409 로 거부한다). */
    @Version
    private Integer version;

    @Column(length = 4)
    private String bizYr;

    // 행사명 — 표준 용어 EVNT_NM(명V200, V2_22). 기존 biz_cd(사업코드)에 명칭을 저장하던 오용을 정화.
    @Column(length = 200)
    private String evntNm;

    @Column(length = 4000)
    private String evntCn;

    @Column(length = 8)
    private String evntBgngYmd;

    @Column(length = 8)
    private String evntEndYmd;

    private Long evntUseCnt;

    @Column(length = 100)
    private String picNm;

    @Column(length = 2500)
    private String prepMttr;

    @Column(length = 12)
    private String evntTypeCd;

    /**
     * 온라인 참가 신청 정원(V2_152, 정원인원수 수N10). 비어 있으면 정원 없이 받는다.
     * 승인 대기·승인 신청 수가 이 값에 이르면 새 신청을 거부한다 — 셈은 행사 행을 잠근 뒤 한다(EventApplicationService).
     * 화면의 '참여 정원'(evnt_use_cnt, 행사사용수)과 다르다: 그 값은 신청을 막지 않는 안내 값이다.
     * 표준 도메인 수N10 이 numeric 이라 {@code BigInteger} 로 매핑하고(BoardMaster 선례) 밖으로는 정수로 내보낸다.
     */
    @Column(name = "pscp_nope", precision = 10, scale = 0)
    @Getter(AccessLevel.NONE)
    private BigInteger pscpNope;

    /** 신청 마감일(V2_152, yyyyMMdd 한국 날짜). 정해야 신청을 받는다 — 비어 있으면 사용자 화면에 나오지 않는다. */
    @Column(name = "aply_ddln_ymd", length = 8)
    private String aplyDdlnYmd;

    /*
     * [2026-10-19] 행사 승인 여부·승인일은 승인 처리 흐름이 제품에 없어 API·화면에서 걷었다. 물리 컬럼은 남기므로
     *   매핑만 읽기 전용으로 둔다 — 앱은 쓰지 않는다. 수정의 재빌드-merge 도 이 두 컬럼을 덮지 않는다(updatable=false).
     */
    @Column(length = 1, insertable = false, updatable = false)
    private String evntAprvYn;

    @Column(length = 8, insertable = false, updatable = false)
    private String evntAprvYmd;

    /**
     * [Phase 5.2] 빌더를 정적 팩토리에 배치. 기존 EventInfo.builder()...build() 호출부는 그대로 동작한다.
     * 감사 필드(frstRgtrId/lastMdfrId 등)는 JPA Auditing 이 채우므로 빌더 파라미터에서 제외한다.
     */
    private EventInfo(Long evntSn, String bizYr, String evntNm, String evntCn,
                      String evntBgngYmd, String evntEndYmd, Long evntUseCnt, String picNm,
                      String prepMttr, String evntTypeCd, Integer pscpNope, String aplyDdlnYmd) {
        this.evntSn = evntSn;
        this.bizYr = bizYr;
        this.evntNm = evntNm;
        this.evntCn = evntCn;
        this.evntBgngYmd = evntBgngYmd;
        this.evntEndYmd = evntEndYmd;
        this.evntUseCnt = evntUseCnt;
        this.picNm = picNm;
        this.prepMttr = prepMttr;
        this.evntTypeCd = evntTypeCd;
        this.pscpNope = pscpNope == null ? null : BigInteger.valueOf(pscpNope);
        this.aplyDdlnYmd = aplyDdlnYmd;
    }

    @Builder
    public static EventInfo create(Long evntSn, String bizYr, String evntNm, String evntCn,
                                   String evntBgngYmd, String evntEndYmd, Long evntUseCnt, String picNm,
                                   String prepMttr, String evntTypeCd, Integer pscpNope, String aplyDdlnYmd) {
        return new EventInfo(evntSn, bizYr, evntNm, evntCn, evntBgngYmd, evntEndYmd, evntUseCnt,
                picNm, prepMttr, evntTypeCd, pscpNope, aplyDdlnYmd);
    }

    /** 신청 정원. 비어 있으면 정원 없음. */
    public Integer getPscpNope() {
        return pscpNope == null ? null : pscpNope.intValueExact();
    }

    /** 관리 중인 엔티티를 제자리에서 갱신해 @Version 과 읽기 전용 승인 컬럼(evntAprvYn·evntAprvYmd)을 보존한다. */
    public void update(String bizYr, String evntNm, String evntCn, String evntBgngYmd, String evntEndYmd,
                       Long evntUseCnt, String picNm, String prepMttr, String evntTypeCd,
                       Integer pscpNope, String aplyDdlnYmd) {
        this.bizYr = bizYr;
        this.evntNm = evntNm;
        this.evntCn = evntCn;
        this.evntBgngYmd = evntBgngYmd;
        this.evntEndYmd = evntEndYmd;
        this.evntUseCnt = evntUseCnt;
        this.picNm = picNm;
        this.prepMttr = prepMttr;
        this.evntTypeCd = evntTypeCd;
        this.pscpNope = pscpNope == null ? null : BigInteger.valueOf(pscpNope);
        this.aplyDdlnYmd = aplyDdlnYmd;
    }
}
