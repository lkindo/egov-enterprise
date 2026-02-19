package com.company.project.domain.ulm;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QUnityLink is a Querydsl query type for UnityLink
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUnityLink extends EntityPathBase<UnityLink> {

    private static final long serialVersionUID = 271549920L;

    public static final QUnityLink unityLink = new QUnityLink("unityLink");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath unityLinkDc = createString("unityLinkDc");

    public final StringPath unityLinkId = createString("unityLinkId");

    public final StringPath unityLinkNm = createString("unityLinkNm");

    public final StringPath unityLinkSeCode = createString("unityLinkSeCode");

    public final StringPath unityLinkUrl = createString("unityLinkUrl");

    public QUnityLink(String variable) {
        super(UnityLink.class, forVariable(variable));
    }

    public QUnityLink(Path<? extends UnityLink> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUnityLink(PathMetadata metadata) {
        super(UnityLink.class, metadata);
    }

}

