package com.company.project.domain.user.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QGeneralUser is a Querydsl query type for GeneralUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QGeneralUser extends EntityPathBase<GeneralUser> {

    private static final long serialVersionUID = 611327764L;

    public static final QGeneralUser generalUser = new QGeneralUser("generalUser");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath adres = createString("adres");

    public final StringPath areaNo = createString("areaNo");

    public final DateTimePath<java.time.LocalDateTime> chgPwdLastPnttm = createDateTime("chgPwdLastPnttm", java.time.LocalDateTime.class);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath detailAdres = createString("detailAdres");

    public final StringPath endTelno = createString("endTelno");

    public final StringPath esntlId = createString("esntlId");

    public final StringPath groupId = createString("groupId");

    public final StringPath ihidnum = createString("ihidnum");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lockAt = createString("lockAt");

    public final StringPath mberEmailAdres = createString("mberEmailAdres");

    public final StringPath mberFxnum = createString("mberFxnum");

    public final StringPath mberId = createString("mberId");

    public final StringPath mberNm = createString("mberNm");

    public final StringPath mberSttus = createString("mberSttus");

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath moblphonNo = createString("moblphonNo");

    public final StringPath password = createString("password");

    public final StringPath passwordCnsr = createString("passwordCnsr");

    public final StringPath passwordHint = createString("passwordHint");

    public final DateTimePath<java.time.LocalDateTime> sbscrbDe = createDateTime("sbscrbDe", java.time.LocalDateTime.class);

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public final StringPath zip = createString("zip");

    public QGeneralUser(String variable) {
        super(GeneralUser.class, forVariable(variable));
    }

    public QGeneralUser(Path<? extends GeneralUser> path) {
        super(path.getType(), path.getMetadata());
    }

    public QGeneralUser(PathMetadata metadata) {
        super(GeneralUser.class, metadata);
    }

}

