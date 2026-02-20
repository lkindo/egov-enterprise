package egovframework.com.utl.pao.service.impl;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.pao.service.PrntngOutptVO;

/**
 *
 * ?꾩옄愿?몄뿉???ъ슜?댁빞 ?섎뒗 ?쒕퉬?ㅻ? ?뺤쓽?섍린?꾪븳 ?곗씠???묎렐 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.02.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.02.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Repository("PrntngOutptDAO")
public class PrntngOutptDAO extends EgovComAbstractDAO {

    /**
	 * 二쇱뼱吏?議곌굔???곕Ⅸ 怨듯넻肄붾뱶瑜?遺덈윭?⑤떎.
	 * @param vo
	 * @return
	 * @throws Exception
	 */
	public PrntngOutptVO selectErncsl(PrntngOutptVO vo) throws Exception{
		String queryId = "PrntngOutptDAO.selectErncsl";
		return (PrntngOutptVO) selectOne(queryId, vo);
	}

}
