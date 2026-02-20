package com.company.project.domain.user.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QUser is a Querydsl query type for User
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUser extends EntityPathBase<User> {

    private static final long serialVersionUID = -2044323670L;

    public static final QUser user = new QUser("user");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath areaNo = createString("areaNo");

    public final StringPath brth = createString("brth");

    public final NumberPath<Integer> changePasswordCount = createNumber("changePasswordCount", Integer.class);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath detailAdres = createString("detailAdres");

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath emplNo = createString("emplNo");

    public final StringPath empStatus = createString("empStatus");

    public final StringPath esntlId = createString("esntlId");

    public final StringPath fxnum = createString("fxnum");

    public final StringPath groupId = createString("groupId");

    public final StringPath homeadres = createString("homeadres");

    public final StringPath homeendTelno = createString("homeendTelno");

    public final StringPath homemiddleTelno = createString("homemiddleTelno");

    public final StringPath ihidnum = createString("ihidnum");

    public final StringPath insttCode = createString("insttCode");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lockAt = createString("lockAt");

    public final NumberPath<Integer> lockCount = createNumber("lockCount", Integer.class);

    public final DateTimePath<java.time.LocalDateTime> lockLastDate = createDateTime("lockLastDate", java.time.LocalDateTime.class);

    public final StringPath moblphonNo = createString("moblphonNo");

    public final StringPath ofcpsNm = createString("ofcpsNm");

    public final StringPath offmTelno = createString("offmTelno");

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath password = createString("password");

    public final StringPath passwordCnsr = createString("passwordCnsr");

    public final StringPath passwordHint = createString("passwordHint");

    public final DateTimePath<java.time.LocalDateTime> passwordUpdateDate = createDateTime("passwordUpdateDate", java.time.LocalDateTime.class);

    public final EnumPath<Role> role = createEnum("role", Role.class);

    public final DateTimePath<java.time.LocalDateTime> sbscrbDe = createDateTime("sbscrbDe", java.time.LocalDateTime.class);

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public final StringPath subDn = createString("subDn");

    public final StringPath userId = createString("userId");

    public final StringPath userNm = createString("userNm");

    public final StringPath zip = createString("zip");

    public QUser(String variable) {
        super(User.class, forVariable(variable));
    }

    public QUser(Path<? extends User> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUser(PathMetadata metadata) {
        super(User.class, metadata);
    }

}

