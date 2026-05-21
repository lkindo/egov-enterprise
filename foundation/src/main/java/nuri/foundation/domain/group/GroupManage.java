package nuri.foundation.domain.group;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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

    @Column(name = "group_nm", length = 100)
    private String groupNm;

    @Column(name = "group_dc", length = 4000)
    private String groupDc;

    @Column(name = "group_crt_ymd")
    @Builder.Default
    private LocalDateTime groupCreatDe = LocalDateTime.now();

    public void update(String groupNm, String groupDc) {
        this.groupNm = groupNm;
        this.groupDc = groupDc;
    }

    // Helper for legacy string date
    public String getGroupCreatDeString() {
        return groupCreatDe != null ? groupCreatDe.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "";
    }
}
