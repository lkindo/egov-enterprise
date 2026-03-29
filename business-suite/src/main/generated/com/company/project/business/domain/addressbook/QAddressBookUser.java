package com.company.project.business.domain.addressbook;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAddressBookUser is a Querydsl query type for AddressBookUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAddressBookUser extends EntityPathBase<AddressBookUser> {

    private static final long serialVersionUID = 618087624L;

    public static final QAddressBookUser addressBookUser = new QAddressBookUser("addressBookUser");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath adbkId = createString("adbkId");

    public final StringPath adbkUserId = createString("adbkUserId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath fxnum = createString("fxnum");

    public final StringPath homeTelno = createString("homeTelno");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath moblphonNo = createString("moblphonNo");

    public final StringPath nm = createString("nm");

    public final StringPath offmTelno = createString("offmTelno");

    public QAddressBookUser(String variable) {
        super(AddressBookUser.class, forVariable(variable));
    }

    public QAddressBookUser(Path<? extends AddressBookUser> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAddressBookUser(PathMetadata metadata) {
        super(AddressBookUser.class, metadata);
    }

}

