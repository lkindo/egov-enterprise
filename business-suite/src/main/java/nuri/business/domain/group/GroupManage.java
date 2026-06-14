package nuri.business.domain.group;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Entity
@Table(name = "tb_authrt_group_info")
@SuperBuilder
public class GroupManage extends BaseEntity {

    @Id
    @Column(name = "group_id", length = 20)
    private String groupId;

    @Column(length = 100)
    private String groupNm;

    @Column(length = 4000)
    private String groupDc;

    @Builder.Default
    private LocalDateTime groupCrtYmd = LocalDateTime.now();

    public void update(String groupNm, String groupDc) {
        this.groupNm = groupNm;
        this.groupDc = groupDc;
    }

}
