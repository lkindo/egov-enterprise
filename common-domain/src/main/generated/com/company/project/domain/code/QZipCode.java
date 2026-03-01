package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QZipCode is a Querydsl query type for ZipCode
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QZipCode extends EntityPathBase<ZipCode> {

    private static final long serialVersionUID = 1785983044L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QZipCode zipCode = new QZipCode("zipCode");

    public final StringPath ctprvnNm = createString("ctprvnNm");

    public final StringPath emdNm = createString("emdNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final QZipCode_ZipCodeId id;

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath liBuldNm = createString("liBuldNm");

    public final StringPath lnbrDongHo = createString("lnbrDongHo");

    public final StringPath signguNm = createString("signguNm");

    public QZipCode(String variable) {
        this(ZipCode.class, forVariable(variable), INITS);
    }

    public QZipCode(Path<? extends ZipCode> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QZipCode(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QZipCode(PathMetadata metadata, PathInits inits) {
        this(ZipCode.class, metadata, inits);
    }

    public QZipCode(Class<? extends ZipCode> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QZipCode_ZipCodeId(forProperty("id")) : null;
    }

}
