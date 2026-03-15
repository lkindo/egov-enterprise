package com.company.project.domain.group;

import com.company.project.domain.common.BaseEntity;
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
@Table(name = "NAUTHORGROUPINFO")
@SuperBuilder
public class GroupManage extends BaseEntity {

    @Id
    @Column(name = "GROUP_ID", length = 20)
    private String groupId;

    @Column(name = "GROUP_NM", length = 60)
    private String groupNm;

    @Column(name = "GROUP_DC", length = 100)
    private String groupDc;

    @Column(name = "GROUP_CREAT_DE")
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
