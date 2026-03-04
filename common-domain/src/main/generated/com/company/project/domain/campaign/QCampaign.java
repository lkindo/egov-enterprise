package com.company.project.domain.campaign;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QCampaign is a Querydsl query type for Campaign
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCampaign extends EntityPathBase<Campaign> {

    private static final long serialVersionUID = 32623607L;

    public static final QCampaign campaign = new QCampaign("campaign");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath chargerNm = createString("chargerNm");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath eventBeginDe = createString("eventBeginDe");

    public final StringPath eventCn = createString("eventCn");

    public final StringPath eventConfmAt = createString("eventConfmAt");

    public final StringPath eventConfmDe = createString("eventConfmDe");

    public final StringPath eventEndDe = createString("eventEndDe");

    public final StringPath eventId = createString("eventId");

    public final StringPath eventTyCode = createString("eventTyCode");

    public final ListPath<CampaignExternalHr, QCampaignExternalHr> externalHrs = this.<CampaignExternalHr, QCampaignExternalHr>createList("externalHrs", CampaignExternalHr.class, QCampaignExternalHr.class, PathInits.DIRECT2);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath prparetgCn = createString("prparetgCn");

    public final NumberPath<Long> svcUseNmprCo = createNumber("svcUseNmprCo", Long.class);

    public QCampaign(String variable) {
        super(Campaign.class, forVariable(variable));
    }

    public QCampaign(Path<? extends Campaign> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCampaign(PathMetadata metadata) {
        super(Campaign.class, metadata);
    }

}
