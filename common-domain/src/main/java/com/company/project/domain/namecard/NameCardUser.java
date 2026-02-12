package com.company.project.domain.namecard;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 명함 사용 정보 JPA Entity
 * 레거시 테이블: NNCRDUSER
 */
@Entity
@Table(name = "NNCRDUSER")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(NameCardUserId.class)
public class NameCardUser {

    @Id
    @Column(name = "NCRD_ID", length = 20)
    private String ncrdId;

    @Id
    @Column(name = "EMPLYR_ID", length = 20)
    private String emplyrId;

    @Column(name = "CREAT_DT")
    private LocalDateTime creatDt;

    @Column(name = "REGIST_SE_CODE", length = 6)
    private String registSeCode;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    @Builder
    public NameCardUser(String ncrdId, String emplyrId, String registSeCode, String useAt) {
        this.ncrdId = ncrdId;
        this.emplyrId = emplyrId;
        this.registSeCode = registSeCode;
        this.useAt = useAt;
        this.creatDt = LocalDateTime.now();
    }

    public void updateUseAt(String useAt) {
        this.useAt = useAt;
    }
}

/**
 * 복합키 클래스
 */
class NameCardUserId implements Serializable {
    private String ncrdId;
    private String emplyrId;

    public NameCardUserId() {}
    public NameCardUserId(String ncrdId, String emplyrId) {
        this.ncrdId = ncrdId;
        this.emplyrId = emplyrId;
    }
}
