package com.company.project.domain.addressbook;

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

    private static final long serialVersionUID = 820578869L;

    public static final QAddressBook addressBook = new QAddressBook("addressBook");

    public final StringPath adbkId = createString("adbkId");

    public final StringPath adbkNm = createString("adbkNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

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
