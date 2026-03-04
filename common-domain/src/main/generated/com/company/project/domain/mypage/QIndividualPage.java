package com.company.project.domain.mypage;

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

    private static final long serialVersionUID = 583981092L;

    public static final QIndividualPage individualPage = new QIndividualPage("individualPage");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

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
