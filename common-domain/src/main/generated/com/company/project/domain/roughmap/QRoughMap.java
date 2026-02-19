package com.company.project.domain.roughmap;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QRoughMap is a Querydsl query type for RoughMap
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRoughMap extends EntityPathBase<RoughMap> {

    private static final long serialVersionUID = 125121847L;

    public static final QRoughMap roughMap = new QRoughMap("roughMap");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath infoWindow = createString("infoWindow");

    public final StringPath la = createString("la");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lo = createString("lo");

    public final StringPath markerLa = createString("markerLa");

    public final StringPath markerLo = createString("markerLo");

    public final StringPath roughMapAddress = createString("roughMapAddress");

    public final StringPath roughMapId = createString("roughMapId");

    public final StringPath roughMapSj = createString("roughMapSj");

    public final StringPath zoomLevel = createString("zoomLevel");

    public QRoughMap(String variable) {
        super(RoughMap.class, forVariable(variable));
    }

    public QRoughMap(Path<? extends RoughMap> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRoughMap(PathMetadata metadata) {
        super(RoughMap.class, metadata);
    }

}

