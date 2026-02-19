package com.company.project.domain.mypage;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMyPageContent is a Querydsl query type for MyPageContent
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMyPageContent extends EntityPathBase<MyPageContent> {

    private static final long serialVersionUID = -1040866622L;

    public static final QMyPageContent myPageContent = new QMyPageContent("myPageContent");

    public final StringPath cntcUrl = createString("cntcUrl");

    public final StringPath cntntsDc = createString("cntntsDc");

    public final StringPath cntntsId = createString("cntntsId");

    public final StringPath cntntsLinkUrl = createString("cntntsLinkUrl");

    public final StringPath cntntsNm = createString("cntntsNm");

    public final StringPath cntntsUseAt = createString("cntntsUseAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public QMyPageContent(String variable) {
        super(MyPageContent.class, forVariable(variable));
    }

    public QMyPageContent(Path<? extends MyPageContent> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMyPageContent(PathMetadata metadata) {
        super(MyPageContent.class, metadata);
    }

}

