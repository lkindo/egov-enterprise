package com.company.project.domain.board;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "NBBSUSE")
@IdClass(BoardUseId.class)
@SuperBuilder
public class BoardUse extends BaseTimeEntity implements Serializable {

    @Id
    @Column(name = "BBS_ID", length = 20)
    private String bbsId;

    @Id
    @Column(name = "TRGET_ID", length = 20)
    private String trgetId;

    @Column(name = "REGIST_SE_CODE", length = 6)
    private String registSeCode;

    @Column(name = "USE_AT", length = 1)
    private String useAt;

    public BoardUse(String bbsId, String trgetId, String registSeCode, String useAt) {
        this.bbsId = bbsId;
        this.trgetId = trgetId;
        this.registSeCode = registSeCode;
        this.useAt = useAt;
    }

    public void update(String useAt) {
        this.useAt = useAt;
    }

    public void setUseAt(String useAt) {
        this.useAt = useAt;
    }

    public void setLastUpdusrId(String lastUpdusrId) {
        // This field doesn't exist in the entity - kept for compatibility
    }

    public void setFrstRegisterId(String frstRegisterId) {
        // This field doesn't exist in the entity - kept for compatibility
    }
}
