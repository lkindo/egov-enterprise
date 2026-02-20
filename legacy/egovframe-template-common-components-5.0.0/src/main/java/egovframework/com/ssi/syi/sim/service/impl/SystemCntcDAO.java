package egovframework.com.ssi.syi.sim.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.ssi.syi.sim.service.SystemCntc;
import egovframework.com.ssi.syi.sim.service.SystemCntcVO;

/**
 *
 * ?쒖뒪?쒖뿰怨꾩뿉 ????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
 * @author 怨듯넻?쒕퉬??媛쒕컻? ?댁쨷??
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  ?댁쨷??         理쒖큹 ?앹꽦
 *
 * Copyright (C) 2009 by MOPAS  All rights reserved.
 * </pre>
 */
@Repository("SystemCntcDAO")
public class SystemCntcDAO extends EgovComAbstractDAO {

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ??젣?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	public void deleteSystemCntc(SystemCntc systemCntc) throws Exception {
        delete("SystemCntcDAO.deleteSystemCntc", systemCntc);
	}

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?깅줉?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	public void insertSystemCntc(SystemCntc systemCntc) throws Exception {
        insert("SystemCntcDAO.insertSystemCntc", systemCntc);
	}

	/**
	 * ?쒖뒪?쒖뿰怨??곸꽭??ぉ??議고쉶?쒕떎.
	 * @param systemCntc
	 * @return SystemCntc(?쒖뒪?쒖뿰怨?
	 */
	public SystemCntc selectSystemCntcDetail(SystemCntc systemCntc) throws Exception {
		return (SystemCntc) selectOne("SystemCntcDAO.selectSystemCntcDetail", systemCntc);
	}

	/**
	 * ?쒖뒪?쒖뿰怨??뱀씤/?뱀씤痍⑥냼?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	public void confirmSystemCntc(SystemCntc systemCntc) throws Exception {
        update("SystemCntcDAO.confirmSystemCntc", systemCntc);
	}


    /**
	 * ?쒖뒪?쒖뿰怨?紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?쒖뒪?쒖뿰怨?紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectSystemCntcList(SystemCntcVO searchVO) throws Exception {
        return selectList("SystemCntcDAO.selectSystemCntcList", searchVO);
    }

    /**
	 * ?쒖뒪?쒖뿰怨?珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?쒖뒪?쒖뿰怨?珥?媛쒖닔)
     */
    public int selectSystemCntcListTotCnt(SystemCntcVO searchVO) throws Exception {
        return (Integer)selectOne("SystemCntcDAO.selectSystemCntcListTotCnt", searchVO);
    }

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?섏젙?쒕떎.
	 * @param systemCntc
	 * @throws Exception
	 */
	public void updateSystemCntc(SystemCntc systemCntc) throws Exception {
		update("SystemCntcDAO.updateSystemCntc", systemCntc);
	}

}
