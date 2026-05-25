package nuri.business.service.addressbook.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "주소록 연락처 정보 DTO")
public class AddressBookUserDto {
    @Schema(description = "주소록 구성원 ID", example = "ADBKU_0000000000001")
    private String adbkConstntId;

    @Schema(description = "주소록 ID", example = "ADBK_000000000000001")
    private String adbkId;

    @Schema(description = "사용자 ID", example = "USRCNFRM_00000000001")
    private String userId;

    @Schema(description = "구성원명", example = "홍길동")
    private String nm;

    @Schema(description = "이메일 주소", example = "user@example.com")
    private String emlAddr;

    @Schema(description = "집 전화번호", example = "02-1234-5678")
    private String homeTelno;

    @Schema(description = "휴대전화 번호", example = "010-1234-5678")
    private String mblTelno;

    @Schema(description = "사무실 전화번호", example = "02-987-6543")
    private String ofcTelno;

    @Schema(description = "팩스 번호", example = "02-111-2222")
    private String faxNo;

    // ----- [Legacy Aliases for Internal Java Parity] -----
    @JsonIgnore
    public String getAdbkUserId() {
        return adbkConstntId;
    }

    @JsonIgnore
    public void setAdbkUserId(String adbkUserId) {
        this.adbkConstntId = adbkUserId;
    }

    @JsonIgnore
    public String getUserNm() {
        return nm;
    }

    @JsonIgnore
    public void setUserNm(String userNm) {
        this.nm = userNm;
    }

    @JsonIgnore
    public String getOfficeTelno() {
        return ofcTelno;
    }

    @JsonIgnore
    public void setOfficeTelno(String officeTelno) {
        this.ofcTelno = officeTelno;
    }

    // Existing manual getters for backward compatibility
    public String getEmlAddr() { return emlAddr; }
    public String getMblTelno() { return mblTelno; }
    public String getFaxNo() { return faxNo; }
}

