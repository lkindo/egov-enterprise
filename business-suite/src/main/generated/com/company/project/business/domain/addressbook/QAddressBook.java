package com.company.project.business.domain.addressbook;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAddressBook is a Querydsl query type for AddressBook
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAddressBook extends EntityPathBase<AddressBook> {

    private static final long serialVersionUID = 334879581L;

    public static final QAddressBook addressBook = new QAddressBook("addressBook");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath adbkId = createString("adbkId");

    public final StringPath adbkNm = createString("adbkNm");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath othbcScope = createString("othbcScope");

    public final StringPath trgetOrgnztId = createString("trgetOrgnztId");

    public final StringPath useAt = createString("useAt");

    public final StringPath wrterId = createString("wrterId");

    public QAddressBook(String variable) {
        super(AddressBook.class, forVariable(variable));
    }

    public QAddressBook(Path<? extends AddressBook> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAddressBook(PathMetadata metadata) {
        super(AddressBook.class, metadata);
    }

}

