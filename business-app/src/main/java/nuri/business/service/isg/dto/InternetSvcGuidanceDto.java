package nuri.business.service.isg.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternetSvcGuidanceDto {
    private Long itntSrvcSn;

    @NotBlank(message = "인터넷 서비스 명칭은 필수입니다.")
    // [2026-09-02] 255 → 100. 물리 컬럼 tb_intrn_svc.itnt_svc_nm 은 varchar(100) 이고 엔티티도
    //   @Column(length=100) 인데 DTO 만 255 라, 101~255자 입력이 검증을 통과한 뒤 DB 제약 위반으로
    //   500 이 났다. 계약이 물리 스키마보다 넓으면 "허용" 이라고 공표한 값이 실제로는 실패한다.
    @Size(max = 100, message = "인터넷 서비스 명칭은 100자 이내여야 합니다.")
    private String intnetSvcNm;

    @NotBlank(message = "인터넷 서비스 설명은 필수입니다.")
    @Size(max = 1000, message = "인터넷 서비스 설명은 1000자 이내여야 합니다.")
    private String intnetSvcDc;

    @Size(max = 1, message = "반영 여부는 1자여야 합니다.")
    private String reflctAt;
    private String userId;
    private LocalDateTime regDate;
}
