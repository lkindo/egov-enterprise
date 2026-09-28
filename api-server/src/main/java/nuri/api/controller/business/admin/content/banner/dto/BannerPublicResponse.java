package nuri.api.controller.business.admin.content.banner.dto;

import nuri.business.service.system.content.banner.dto.BannerDto;

/** 일반 사용자 표시용. 내부 등록자·감사 정보는 관리자 응답에만 남긴다. */
public record BannerPublicResponse(Long bnrSn, String bnrNm, String linkUrl, String bnrImgNm,
        String bnrExpln, Long sortOrdr, String rfltYn, Long atchFileSn) {
    public static BannerPublicResponse from(BannerDto dto) {
        return new BannerPublicResponse(dto.getBnrSn(), dto.getBnrNm(), dto.getLinkUrl(), dto.getBnrImgNm(),
                dto.getBnrExpln(), dto.getSortOrdr(), dto.getRfltYn(), dto.getAtchFileSn());
    }
}
