package nuri.foundation.domain.operation;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 포상 관리 엔티티
 * [Standardization] BaseEntity 상속을 통한 감사 필드 통합
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_rward_manage")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class RewardManage extends BaseEntity {

    @Id
    @Column(name = "rwrd_id", length = 20)
    private String rwrdId;

    @Column(length = 20, nullable = false)
    private String rwrdUserId;

    @Column(length = 12, nullable = false)
    private String rwrdCd;

    @Column(length = 8)
    private String rwrdYmd;

    @Column(length = 100)
    private String rwrdNm;

    @Column(length = 4000)
    private String cntrbCn;

    @Column(length = 20)
    private String atrzrId;

    @Column(length = 1)
    private String confmYn;

    private java.time.LocalDateTime aprvDt;

    @Column(length = 4000)
    private String rtnRsnCn;

    @Column(length = 20)
    private String atchFileId;

    @Column(length = 20)
    private String ifmlAtrzId;

    // ----- [Legacy Getter Aliases] -----

    public String getRwardId() { return this.rwrdId; }
    public String getRwardwnrId() { return this.rwrdUserId; }
    public String getRwardCode() { return this.rwrdCd; }
    public String getRwardDe() { return this.rwrdYmd; }
    public String getRwardNm() { return this.rwrdNm; }
    public String getPblenCn() { return this.cntrbCn; }
    public String getSanctnerId() { return this.atrzrId; }
    public String getConfmAt() { return this.confmYn; }
    public java.time.LocalDateTime getSanctnDt() { return this.aprvDt; }
    public String getReturnResn() { return this.rtnRsnCn; }
    public String getInformlSanctnId() { return this.ifmlAtrzId; }

    // ----- [Custom Builder Extension for Backwards Compatibility] -----

    public static abstract class RewardManageBuilder<C extends RewardManage, B extends RewardManageBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        public B rwardId(String rwardId) {
            this.rwrdId = rwardId;
            return self();
        }
        public B rwardwnrId(String rwardwnrId) {
            this.rwrdUserId = rwardwnrId;
            return self();
        }
        public B rwardCode(String rwardCode) {
            this.rwrdCd = rwardCode;
            return self();
        }
        public B rwardDe(String rwardDe) {
            this.rwrdYmd = rwardDe;
            return self();
        }
        public B rwardNm(String rwardNm) {
            this.rwrdNm = rwardNm;
            return self();
        }
        public B pblenCn(String pblenCn) {
            this.cntrbCn = pblenCn;
            return self();
        }
        public B sanctnerId(String sanctnerId) {
            this.atrzrId = sanctnerId;
            return self();
        }
        public B confmAt(String confmAt) {
            this.confmYn = confmAt;
            return self();
        }
        public B sanctnDt(java.time.LocalDateTime sanctnDt) {
            this.aprvDt = sanctnDt;
            return self();
        }
        public B returnResn(String returnResn) {
            this.rtnRsnCn = returnResn;
            return self();
        }
        public B informlSanctnId(String informlSanctnId) {
            this.ifmlAtrzId = informlSanctnId;
            return self();
        }
    }

    public void update(String rwardDe, String rwardNm, String pblenCn) {
        this.rwrdYmd = rwardDe;
        this.rwrdNm = rwardNm;
        this.cntrbCn = pblenCn;
    }
}
