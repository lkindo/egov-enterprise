package com.company.project.domain.user.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QEnterpriseUser is a Querydsl query type for EnterpriseUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEnterpriseUser extends EntityPathBase<EnterpriseUser> {

    private static final long serialVersionUID = 1643437291L;

    public static final QEnterpriseUser enterpriseUser = new QEnterpriseUser("enterpriseUser");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath adres = createString("adres");

    public final StringPath applcntEmailAdres = createString("applcntEmailAdres");

    public final StringPath applcntIhidnum = createString("applcntIhidnum");

    public final StringPath applcntNm = createString("applcntNm");

    public final StringPath areaNo = createString("areaNo");

    public final StringPath bizrno = createString("bizrno");

    public final DateTimePath<java.time.LocalDateTime> chgPwdLastPnttm = createDateTime("chgPwdLastPnttm", java.time.LocalDateTime.class);

    public final StringPath cmpnyNm = createString("cmpnyNm");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath cxfc = createString("cxfc");

    public final StringPath detailAdres = createString("detailAdres");

    public final StringPath entrprsEndTelno = createString("entrprsEndTelno");

    public final StringPath entrprsmberId = createString("entrprsmberId");

    public final StringPath entrprsMberPassword = createString("entrprsMberPassword");

    public final StringPath entrprsMberPasswordCnsr = createString("entrprsMberPasswordCnsr");

    public final StringPath entrprsMberPasswordHint = createString("entrprsMberPasswordHint");

    public final StringPath entrprsMberSttus = createString("entrprsMberSttus");

    public final StringPath entrprsMiddleTelno = createString("entrprsMiddleTelno");

    public final StringPath entrprsSeCode = createString("entrprsSeCode");

    public final StringPath esntlId = createString("esntlId");

    public final StringPath fxnum = createString("fxnum");

    public final StringPath groupId = createString("groupId");

    public final StringPath indutyCode = createString("indutyCode");

    public final StringPath jurirno = createString("jurirno");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lockAt = createString("lockAt");

    public final DateTimePath<java.time.LocalDateTime> sbscrbDe = createDateTime("sbscrbDe", java.time.LocalDateTime.class);

    public final StringPath zip = createString("zip");

    public QEnterpriseUser(String variable) {
        super(EnterpriseUser.class, forVariable(variable));
    }

    public QEnterpriseUser(Path<? extends EnterpriseUser> path) {
        super(path.getType(), path.getMetadata());
    }

    public QEnterpriseUser(PathMetadata metadata) {
        super(EnterpriseUser.class, metadata);
    }

}
