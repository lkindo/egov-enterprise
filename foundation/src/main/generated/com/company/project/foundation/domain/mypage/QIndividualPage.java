package com.company.project.foundation.domain.mypage;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QIndividualPage is a Querydsl query type for IndividualPage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIndividualPage extends EntityPathBase<IndividualPage> {

    private static final long serialVersionUID = 1863321593L;

    public static final QIndividualPage individualPage = new QIndividualPage("individualPage");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath pageDc = createString("pageDc");

    public final StringPath pageId = createString("pageId");

    public final StringPath pageNm = createString("pageNm");

    public final StringPath userId = createString("userId");

    public QIndividualPage(String variable) {
        super(IndividualPage.class, forVariable(variable));
    }

    public QIndividualPage(Path<? extends IndividualPage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIndividualPage(PathMetadata metadata) {
        super(IndividualPage.class, metadata);
    }

}

