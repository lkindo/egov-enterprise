package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QNetworkServiceId is a Querydsl query type for NetworkServiceId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QNetworkServiceId extends BeanPath<NetworkServiceId> {

    private static final long serialVersionUID = 1711567249L;

    public static final QNetworkServiceId networkServiceId = new QNetworkServiceId("networkServiceId");

    public final StringPath sysIp = createString("sysIp");

    public final NumberPath<Integer> sysPort = createNumber("sysPort", Integer.class);

    public QNetworkServiceId(String variable) {
        super(NetworkServiceId.class, forVariable(variable));
    }

    public QNetworkServiceId(Path<? extends NetworkServiceId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNetworkServiceId(PathMetadata metadata) {
        super(NetworkServiceId.class, metadata);
    }

}
