package nuri.business.domain.login;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginPolicySearchResult {
    private String userId; // User ID
    private String userNm; // User Name
    private String userSe; // User Se
    private String ipAddr;
    private String dpcnPrmYn;
    private String lmtYn;
    /*
     * [2026-08-29] bgngTm·endTm·otpUseYn 을 추가한다.
     *
     * projection 은 이미 bgngTm·endTm 을 select 하고 있었지만 이 클래스에 대응 필드가 없어
     * QueryDSL 이 조용히 버렸다 — 값이 결과 객체에 **도달조차 못 했다.** 그래서 목록 화면의
     * '허용 시간' 열이 전 사용자에게 '24시간' 으로 보였다(otpUseYn 은 select 자체가 없었다).
     */
    private String bgngTm; // HHmmss
    private String endTm;  // HHmmss
    private String otpUseYn;
    /** 낙관적 잠금 버전(V2_155). 정책이 없는 사용자는 null 이다(등록은 버전을 보지 않는다). */
    private Integer version;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
    private String regYn; // Y or N
}
