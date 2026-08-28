package nuri.business.service.report.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkReportDto {
    private Long rptpSn;
    private String rptTtl;
    private String rptCn;
    private String rptSeCd;
    /**
     * 작성자 로그인 ID.
     *
     * <p>[2026-08-29] {@code @Size(max = 1)} 오기를 물리 스키마에 맞춘다 —
     * {@code tb_rpt_info.user_id} 는 {@code varchar(20)} 이고 엔티티도 {@code length = 20} 이다.
     * 로그인 ID 가 1자인 경우는 없으므로 종전 값이면 요청 본문에 이 필드를 실은 순간 400 이었다
     * (지금은 서버가 인증 주체로 채우므로 잠재 결함에 머물러 있었다).
     */
    @Size(max = 20)
    private String userId;

    /**
     * 작성자 이름. **서버가 채우는 읽기 전용 표시값**이며 요청 본문의 값은 무시된다.
     *
     * <p>종전에는 목록의 '작성자' 열이 {@code userId} 원문(로그인 ID)을 그대로 보여 줬다.
     * 사람 이름이 아니라 계정 문자열이라, 누가 쓴 보고인지 화면만 보고는 알 수 없었다.
     */
    private String userNm;
    private Long atchFileSn;
    @Size(max = 12)
    private String rptSttsCd;
    @Size(max = 8)
    private String rptYmd;
    private String rptTypeCd;

}
