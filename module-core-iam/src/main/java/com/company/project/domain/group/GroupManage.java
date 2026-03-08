package com.company.project.domain.group;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NAUTHORGROUPINFO")
public class GroupManage {

    @Id
    @Column(name = "GROUP_ID", length = 20)
    private String groupId;

    @Column(name = "GROUP_NM", length = 60)
    private String groupNm;

    @Column(name = "GROUP_DC", length = 100)
    private String groupDc;

    @Column(name = "GROUP_CREAT_DE")
    private LocalDateTime groupCreatDe;

    @Builder
    public GroupManage(String groupId, String groupNm, String groupDc) {
        this.groupId = groupId;
        this.groupNm = groupNm;
        this.groupDc = groupDc;
        this.groupCreatDe = LocalDateTime.now();
    }

    public void update(String groupNm, String groupDc) {
        this.groupNm = groupNm;
        this.groupDc = groupDc;
        // created date not updated usually
    }

    // Helper for legacy string date
    public String getGroupCreatDeString() {
        return groupCreatDe != null ? groupCreatDe.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "";
    }
}
