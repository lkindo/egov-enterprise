package com.company.project.service.usermanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "사용자 관리 정보 DTO")
public class UserManageDto {
    @Schema(description = "사용자 ID", example = "user01")
    private String userId;

    @Schema(description = "고유 식별 ID (esntlId)", example = "USRCNFRM_00000000001")
    private String esntlId;

    @Schema(description = "사용자 명", example = "홍길동")
    private String userNm;

    @Schema(description = "비밀번호", example = "password123!")
    private String password;

    @Schema(description = "비밀번호 힌트", example = "가장 좋아하는 도시는?")
    private String passwordHint;

    @Schema(description = "비밀번호 정답", example = "서울")
    private String passwordCnsr;

    @Schema(description = "사번", example = "20240101")
    private String emplNo;

    @Schema(description = "성별 코드", example = "M")
    private String sexdstnCode;

    @Schema(description = "생년월일", example = "1990-01-01")
    private String brthdy;

    @Schema(description = "지역 번호", example = "02")
    private String areaNo;

    @Schema(description = "전화번호(중간)", example = "1234")
    private String homemiddleTelno;

    @Schema(description = "전화번호(끝)", example = "5678")
    private String homeendTelno;

    @Schema(description = "휴대폰 번호", example = "010-1234-5678")
    private String moblphonNo;

    @Schema(description = "이메일 주소", example = "hong@example.com")
    private String emailAdres;

    @Schema(description = "우편번호", example = "12345")
    private String zip;

    @Schema(description = "주소", example = "서울특별시 강남구 ...")
    private String homeadres;

    @Schema(description = "상세 주소", example = "101동 101호")
    private String detailAdres;

    @Schema(description = "직위 명", example = "선임연구원")
    private String ofcpsNm;

    @Schema(description = "그룹 ID", example = "GROUP_01")
    private String groupId;

    @Schema(description = "조직 ID", example = "ORGNZT_01")
    private String orgnztId;

    @Schema(description = "기관 코드", example = "INST_01")
    private String insttCode;

    @Schema(description = "사용자 상태 코드", example = "P")
    private String emplyrSttusCode;

    @Schema(description = "가입 일자", example = "2024-03-17")
    private String sbscrbDe;

    @Schema(description = "사무실 전화번호", example = "02-123-4567")
    private String offmTelno;

    @Schema(description = "팩스 번호", example = "02-123-4568")
    private String fxnum;

    @Schema(description = "계정 잠금 여부", example = "N")
    private String lockAt;

    @Schema(description = "서브 DN", example = "cn=hong,ou=users,dc=company,dc=com")
    private String subDn;

    public String getEmplyrId() {
        return userId;
    }

    public void setEmplyrId(String emplyrId) {
        this.userId = emplyrId;
    }

    public String getEmplyrNm() {
        return userNm;
    }

    public void setEmplyrNm(String emplyrNm) {
        this.userNm = emplyrNm;
    }

    public String getBrth() {
        return brthdy;
    }

    public void setBrth(String brth) {
        this.brthdy = brth;
    }

    public String getUniqId() {
        return esntlId;
    }

    public void setUniqId(String uniqId) {
        this.esntlId = uniqId;
    }
}

