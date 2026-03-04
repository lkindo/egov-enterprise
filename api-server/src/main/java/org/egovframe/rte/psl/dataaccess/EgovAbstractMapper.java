package org.egovframe.rte.psl.dataaccess;

import org.apache.ibatis.session.SqlSessionFactory;

import org.mybatis.spring.support.SqlSessionDaoSupport;

/**

 * ?         ?   ? ??      ????      ??                ?           ????          ?         ?DAO ??  ???

 *

 * @author Vincent Han

 * @since 2014.09.15

 * @version 1.0

 * @see

 *

 * <pre>

 * <<          ???  ??Modification Information) >>

 *

 *   ??      ??     ??      ??         ??      ??

 *  -------    --------    ---------------------------

 *   2014.09.15  Vincent Han                   ????

 *

 * </pre>

 */

public abstract class EgovAbstractMapper extends SqlSessionDaoSupport {

	public void setSqlSessionFactory(SqlSessionFactory sqlSessionFactory) {

		super.setSqlSessionFactory(sqlSessionFactory);

	}

}