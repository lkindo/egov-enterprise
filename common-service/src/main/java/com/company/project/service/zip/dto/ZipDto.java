package com.company.project.service.zip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 우편번호 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZipDto {
    /** 우편번호 */
    private String zip;
    /** 일련번호 */
    private Integer sn;
    /** 시도명 */
    private String ctprvnNm;
    /** 시군구명 */
    private String signguNm;
    /** 읍면동명 */
    private String emdNm;
    /** 리건물명 */
    private String liBuldNm;
    /** 번지동호 */
    private String lnbrDongHo;
    /** 최초등록자ID */
    private String frstRegisterId;
    /** 최종수정자ID */
    private String lastUpdusrId;
}
