package com.company.project.domain.campaign;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QCampaignExternalHr is a Querydsl query type for CampaignExternalHr
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCampaignExternalHr extends EntityPathBase<CampaignExternalHr> {

    private static final long serialVersionUID = 479856012L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QCampaignExternalHr campaignExternalHr = new QCampaignExternalHr("campaignExternalHr");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath areaNo = createString("areaNo");

    public final StringPath brth = createString("brth");

    public final QCampaign campaign;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath endTelno = createString("endTelno");

    public final StringPath extrlHrId = createString("extrlHrId");

    public final StringPath extrlHrNm = createString("extrlHrNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath occpTyCode = createString("occpTyCode");

    public final StringPath psitnInsttNm = createString("psitnInsttNm");

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public QCampaignExternalHr(String variable) {
        this(CampaignExternalHr.class, forVariable(variable), INITS);
    }

    public QCampaignExternalHr(Path<? extends CampaignExternalHr> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QCampaignExternalHr(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QCampaignExternalHr(PathMetadata metadata, PathInits inits) {
        this(CampaignExternalHr.class, metadata, inits);
    }

    public QCampaignExternalHr(Class<? extends CampaignExternalHr> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.campaign = inits.isInitialized("campaign") ? new QCampaign(forProperty("campaign")) : null;
    }

}

