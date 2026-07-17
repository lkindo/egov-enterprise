package nuri.business.domain.group;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "tb_authrt_group_info")
public class GroupManage extends BaseEntity {

    @Id
    @Column(name = "group_id", length = 20)
    private String groupId;

    @Column(length = 100)
    private String groupNm;

    @Column(length = 4000)
    private String groupDc;

    // V2_19: 타입(timestamp)-접미사 정합 리네임 group_crt_ymd → group_crt_dt
    private LocalDateTime groupCrtDt = LocalDateTime.now();

    // @SuperBuilder -> 정적 팩토리 @Builder 전환에 따른 전체 인자 private 생성자
    // groupCrtDt 는 기존 @Builder.Default 재현: null 이면 기본값(LocalDateTime.now()) 병합
    private GroupManage(String groupId, String groupNm, String groupDc, LocalDateTime groupCrtDt) {
        this.groupId = groupId;
        this.groupNm = groupNm;
        this.groupDc = groupDc;
        this.groupCrtDt = groupCrtDt != null ? groupCrtDt : LocalDateTime.now();
    }

    @Builder
    public static GroupManage create(String groupId, String groupNm, String groupDc, LocalDateTime groupCrtDt) {
        return new GroupManage(groupId, groupNm, groupDc, groupCrtDt);
    }

    public void update(String groupNm, String groupDc) {
        this.groupNm = groupNm;
        this.groupDc = groupDc;
    }

}
