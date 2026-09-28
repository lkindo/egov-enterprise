package nuri.api.controller.business.admin.content.popup.dto;

import nuri.business.service.system.content.popup.dto.PopupDto;

/** 일반 사용자 표시용. 내부 등록자·감사 정보는 관리자 응답에만 남긴다. */
public record PopupPublicResponse(Long popupSn, String popupTtlNm, String fileUrl, String popupWdthPstn,
        String popupVrtcPstn, String popupVrtcSz, String popupWdthSz, String ntceBgnde, String ntceEndde,
        String stopvewSetupYn, String ntceYn) {
    public static PopupPublicResponse from(PopupDto dto) {
        return new PopupPublicResponse(dto.getPopupSn(), dto.getPopupTtlNm(), dto.getFileUrl(), dto.getPopupWdthPstn(),
                dto.getPopupVrtcPstn(), dto.getPopupVrtcSz(), dto.getPopupWdthSz(), dto.getNtceBgnde(), dto.getNtceEndde(),
                dto.getStopvewSetupYn(), dto.getNtceYn());
    }
}
