package com.company.project.service.zip.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ?고렪踰덊샇 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ZipDto {
    /** ?고렪踰덊샇 */
    private String zip;
    /** ?쇰젴踰덊샇 */
    private Integer sn;
    /** ?쒕룄紐?*/
    private String ctprvnNm;
    /** ?쒓뎔援щ챸 */
    private String signguNm;
    /** ?띾㈃?숇챸 */
    private String emdNm;
    /** 由ш굔臾쇰챸 */
    private String liBuldNm;
    /** 踰덉??숉샇 */
    private String lnbrDongHo;
    /** 理쒖큹?깅줉?륤D */
    private String frstRegisterId;
    /** 理쒖쥌?섏젙?륤D */
    private String lastUpdusrId;
}
