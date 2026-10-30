package nuri.business.domain.promotion.popup;
import lombok.Builder;
import java.time.LocalDate;

import nuri.foundation.domain.common.BaseEntity;
import nuri.foundation.domain.common.IntegralStringConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity(name = "PopupDomain")
@Table(name = "tb_popup_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Popup extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long popupSn;

    /** 낙관적 잠금 버전(V2_133). 화면이 읽은 값과 다르면 다른 사람이 먼저 고친 것이다(서비스가 409 로 거부한다). */
    @Version
    private Integer version;

    @Column(length = 100, nullable = false)
    private String popupTtlNm;

    @Column(length = 1000)
    private String fileUrl;

    @Column(length = 12)
    private String popupWdthPstn;

    @Column(length = 12)
    private String popupVrtcPstn;

    @Convert(converter = IntegralStringConverter.class)
    @Column(name = "popup_vrtc_sz", precision = 7, scale = 0)
    private String popupVrtcSz;

    @Convert(converter = IntegralStringConverter.class)
    @Column(name = "popup_wdth_sz", precision = 7, scale = 0)
    private String popupWdthSz;

    private LocalDate ntceBgnde;

    private LocalDate ntceEndde;

    @Column(length = 1)
    private String stopvewSetupYn;

    @Column(length = 1)
    private String ntceYn;

    private Popup(Long popupSn, String popupTtlNm, String fileUrl, String popupWdthPstn,
            String popupVrtcPstn, String popupVrtcSz, String popupWdthSz,
            LocalDate ntceBgnde, LocalDate ntceEndde, String stopvewSetupYn, String ntceYn) {
        this.popupSn = popupSn;
        this.popupTtlNm = popupTtlNm;
        this.fileUrl = fileUrl;
        this.popupWdthPstn = popupWdthPstn;
        this.popupVrtcPstn = popupVrtcPstn;
        this.popupVrtcSz = popupVrtcSz;
        this.popupWdthSz = popupWdthSz;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopvewSetupYn = stopvewSetupYn;
        this.ntceYn = ntceYn;
    }

    @Builder
    public static Popup create(Long popupSn, String popupTtlNm, String fileUrl, String popupWdthPstn,
            String popupVrtcPstn, String popupVrtcSz, String popupWdthSz,
            LocalDate ntceBgnde, LocalDate ntceEndde, String stopvewSetupYn, String ntceYn) {
        return new Popup(popupSn, popupTtlNm, fileUrl, popupWdthPstn,
                popupVrtcPstn, popupVrtcSz, popupWdthSz,
                ntceBgnde, ntceEndde, stopvewSetupYn, ntceYn);
    }

    public void update(String popupTtlNm, String fileUrl, String popupWdthPstn, String popupVrtcPstn,
            String popupVrtcSz, String popupWdthSz, LocalDate ntceBgnde, LocalDate ntceEndde,
            String stopvewSetupYn, String ntceYn) {
        this.popupTtlNm = popupTtlNm;
        this.fileUrl = fileUrl;
        this.popupWdthPstn = popupWdthPstn;
        this.popupVrtcPstn = popupVrtcPstn;
        this.popupVrtcSz = popupVrtcSz;
        this.popupWdthSz = popupWdthSz;
        this.ntceBgnde = ntceBgnde;
        this.ntceEndde = ntceEndde;
        this.stopvewSetupYn = stopvewSetupYn;
        this.ntceYn = ntceYn;
    }

    /**
     * 이 날 사용자에게 게시 중인가 — 게시 여부가 {@code Y} 이고 그날이 게시 시작일·종료일 사이(양끝 포함)다.
     * 활성 목록 조회({@code PopupDomainRepository.findActivePopups})와 같은 규칙이다. 기간이 비어 있으면 게시 중이 아니다
     * (그 쿼리의 {@code BETWEEN} 도 NULL 을 고르지 않는다).
     */
    public boolean isPublishedOn(LocalDate day) {
        return "Y".equals(ntceYn) && ntceBgnde != null && ntceEndde != null
                && !day.isBefore(ntceBgnde) && !day.isAfter(ntceEndde);
    }
}
