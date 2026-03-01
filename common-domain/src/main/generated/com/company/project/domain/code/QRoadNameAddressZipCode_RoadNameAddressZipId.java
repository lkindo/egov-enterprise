package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QRoadNameAddressZipCode_RoadNameAddressZipId is a Querydsl query type for RoadNameAddressZipId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QRoadNameAddressZipCode_RoadNameAddressZipId extends BeanPath<RoadNameAddressZipCode.RoadNameAddressZipId> {

    private static final long serialVersionUID = -79462350L;

    public static final QRoadNameAddressZipCode_RoadNameAddressZipId roadNameAddressZipId = new QRoadNameAddressZipCode_RoadNameAddressZipId("roadNameAddressZipId");

    public final StringPath rdmnCode = createString("rdmnCode");

    public final NumberPath<Long> sn = createNumber("sn", Long.class);

    public QRoadNameAddressZipCode_RoadNameAddressZipId(String variable) {
        super(RoadNameAddressZipCode.RoadNameAddressZipId.class, forVariable(variable));
    }

    public QRoadNameAddressZipCode_RoadNameAddressZipId(Path<? extends RoadNameAddressZipCode.RoadNameAddressZipId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRoadNameAddressZipCode_RoadNameAddressZipId(PathMetadata metadata) {
        super(RoadNameAddressZipCode.RoadNameAddressZipId.class, metadata);
    }

}
