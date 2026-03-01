package com.company.project.service.zip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ?고렪踰덊??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZipDto {
    /** ?고렪踰덊??*/
    private String zip;
    /** ??�젴踰덊??*/
    private Integer sn;
    /** ??�룄�?*/
    private String ctprvnNm;
    /** ??�뎔?�щ챸 */
    private String signguNm;
    /** ??�㈃??�챸 */
    private String emdNm;
    /** ?�ш굔?�쇰�?*/
    private String liBuldNm;
    /** 踰덉???�샇 */
    private String lnbrDongHo;
    /** 理쒖??깅줉?륤D */
    private String frstRegisterId;
    /** 理쒖�??�젙?륤D */
    private String lastUpdusrId;
}
