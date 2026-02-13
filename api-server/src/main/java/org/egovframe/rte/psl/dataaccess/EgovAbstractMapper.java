package org.egovframe.rte.psl.dataaccess;

import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.support.SqlSessionDaoSupport;

/**
 * 전자정부 퍼시스 레이어의 마이바티스 연동 추상 DAO 클래스
 * 
 * @author Vincent Han
 * @since 2014.09.15
 * @version 1.0
 * @see
 *
 * <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자          수정내용
 *  -------    --------    ---------------------------
 *   2014.09.15  Vincent Han          최초 생성
 *
 * </pre>
 */
public abstract class EgovAbstractMapper extends SqlSessionDaoSupport {

	public void setSqlSessionFactory(SqlSessionFactory sqlSessionFactory) {
		super.setSqlSessionFactory(sqlSessionFactory);
	}
}