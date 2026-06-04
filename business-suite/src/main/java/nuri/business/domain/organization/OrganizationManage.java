package nuri.business.domain.organization;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "tb_ognz_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OrganizationManage extends BaseEntity {

    @Id
    @Column(name = "ognz_id", length = 20)
    private String ognzId;

    @Column(length = 100)
    private String ognzNm;

    @Column(length = 4000)
    private String ognzExpln;

    // ----- [Legacy Aliases for Backward Compatibility] -----

    @Deprecated
    public String getOrgnztId() {
        return ognzId;
    }

    @Deprecated
    public String getOrgnztNm() {
        return ognzNm;
    }

    @Deprecated
    public String getOrgnztDc() {
        return ognzExpln;
    }

    public static abstract class OrganizationManageBuilder<C extends OrganizationManage, B extends OrganizationManageBuilder<C, B>> extends BaseEntityBuilder<C, B> {
        private String ognzId;
        private String ognzNm;
        private String ognzExpln;

        @Deprecated
        public B orgnztId(String orgnztId) {
            this.ognzId = orgnztId;
            return self();
        }

        @Deprecated
        public B orgnztNm(String orgnztNm) {
            this.ognzNm = orgnztNm;
            return self();
        }

        @Deprecated
        public B orgnztDc(String orgnztDc) {
            this.ognzExpln = orgnztDc;
            return self();
        }
    }
}
