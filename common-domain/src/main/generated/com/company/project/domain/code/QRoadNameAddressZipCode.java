package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QRoadNameAddressZipCode is a Querydsl query type for RoadNameAddressZipCode
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRoadNameAddressZipCode extends EntityPathBase<RoadNameAddressZipCode> {

    private static final long serialVersionUID = -1222263185L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QRoadNameAddressZipCode roadNameAddressZipCode = new QRoadNameAddressZipCode("roadNameAddressZipCode");

    public final StringPath bdnbrMnnm = createString("bdnbrMnnm");

    public final StringPath bdnbrSlno = createString("bdnbrSlno");

    public final StringPath buldNm = createString("buldNm");

    public final StringPath ctprvnNm = createString("ctprvnNm");

    public final StringPath detailBuldNm = createString("detailBuldNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final QRoadNameAddressZipCode_RoadNameAddressZipId id;

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath rdmn = createString("rdmn");

    public final StringPath signguNm = createString("signguNm");

    public final StringPath zip = createString("zip");

    public QRoadNameAddressZipCode(String variable) {
        this(RoadNameAddressZipCode.class, forVariable(variable), INITS);
    }

    public QRoadNameAddressZipCode(Path<? extends RoadNameAddressZipCode> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QRoadNameAddressZipCode(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QRoadNameAddressZipCode(PathMetadata metadata, PathInits inits) {
        this(RoadNameAddressZipCode.class, metadata, inits);
    }

    public QRoadNameAddressZipCode(Class<? extends RoadNameAddressZipCode> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QRoadNameAddressZipCode_RoadNameAddressZipId(forProperty("id")) : null;
    }

}
