package egovframework.com.uss.sam.stp.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.sam.stp.service.StplatManageDefaultVO;
import egovframework.com.uss.sam.stp.service.StplatManageVO;


/**
 *
 * ?쎄??댁슜??泥섎━?섎뒗 DAO ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *   2016.06.13  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
@Repository("StplatManageDAO")
public class StplatManageDAO extends EgovComAbstractDAO {


    /**
	 * ?쎄??뺣낫 湲 紐⑸줉??????곸꽭?댁슜??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
    public StplatManageVO selectStplatDetail(StplatManageVO vo) throws Exception {

        return (StplatManageVO) selectOne("StplatManage.selectStplatDetail", vo);

    }

    /**
	 * ?쎄??뺣낫 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    public List<StplatManageVO> selectStplatList(StplatManageDefaultVO searchVO) throws Exception {

        return selectList("StplatManage.selectStplatList", searchVO);

    }

    /**
	 * ?쎄??뺣낫 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    public int selectStplatListTotCnt(StplatManageDefaultVO searchVO) {

        return (Integer)selectOne("StplatManage.selectStplatListTotCnt", searchVO);

    }

	/**
	 * ?쎄??뺣낫 湲???깅줉?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void insertStplatCn(StplatManageVO vo) throws Exception {

        insert("StplatManage.insertStplatCn", vo);

    }

	/**
	 * ?쎄??뺣낫 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void updateStplatCn(StplatManageVO vo) throws Exception {

        update("StplatManage.updateStplatCn", vo);

    }

	/**
	 * ?쎄??뺣낫 湲????젣?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    public void deleteStplatCn(StplatManageVO vo) throws Exception {

        delete("StplatManage.deleteStplatCn", vo);

    }

}
