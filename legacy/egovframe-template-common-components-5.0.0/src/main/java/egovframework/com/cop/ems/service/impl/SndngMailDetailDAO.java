package egovframework.com.cop.ems.service.impl;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.ems.service.SndngMailVO;

/**
 * 諛쒖넚硫붿씪???곸꽭 議고쉶?섎뒗 DAO ?대옒??
 * 
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤???
 * @since 2009.03.12
 * @version 1.0
 * @see
 *
 *      <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??        ?섏젙??      ?섏젙?댁슜
 *  ----------    --------    ---------------------------
 *  2009.03.12     諛뺤???      理쒖큹 ?앹꽦
 *
 *      </pre>
 */
@Repository("sndngMailDetailDAO")
public class SndngMailDetailDAO extends EgovComAbstractDAO {

	/**
	 * 諛쒖넚硫붿씪???곸꽭 議고쉶?쒕떎.
	 * 
	 * @param vo SndngMailVO
	 * @return SndngMailVO
	 * @exception Exception
	 */
	public SndngMailVO selectSndngMail(SndngMailVO vo) throws Exception {
		return (SndngMailVO) selectOne("sndngMailDetailDAO.selectSndngMail", vo);
	}

	/**
	 * 諛쒖넚硫붿씪????젣?쒕떎.
	 * 
	 * @param vo SndngMailVO
	 * @exception
	 */
	public int deleteSndngMail(SndngMailVO vo) throws Exception {
        return delete("sndngMailDetailDAO.deleteSndngMail", vo);
    }

}
