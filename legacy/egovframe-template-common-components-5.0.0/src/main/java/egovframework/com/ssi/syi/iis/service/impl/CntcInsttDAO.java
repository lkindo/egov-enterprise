package egovframework.com.ssi.syi.iis.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.ssi.syi.iis.service.CntcInstt;
import egovframework.com.ssi.syi.iis.service.CntcInsttVO;
import egovframework.com.ssi.syi.iis.service.CntcService;
import egovframework.com.ssi.syi.iis.service.CntcServiceVO;
import egovframework.com.ssi.syi.iis.service.CntcSystem;
import egovframework.com.ssi.syi.iis.service.CntcSystemVO;

/**
 *
 * ?곌퀎湲곌???????곗씠???묎렐 ?대옒?ㅻ? ?뺤쓽?쒕떎
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
@Repository("CntcInsttDAO")
public class CntcInsttDAO extends EgovComAbstractDAO {


	/**
	 * ?곌퀎湲곌?????젣?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void deleteCntcInstt(CntcInstt cntcInstt) throws Exception {
		delete("CntcInsttDAO.deleteCntcInstt", cntcInstt);
	}

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ??젣?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void deleteCntcSystem(CntcSystem cntcSystem) throws Exception {
		delete("CntcInsttDAO.deleteCntcSystem", cntcSystem);
	}

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ??젣?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void deleteCntcService(CntcService cntcService) throws Exception {
        delete("CntcInsttDAO.deleteCntcService", cntcService);
	}

	/**
	 * ?곌퀎湲곌????깅줉?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void insertCntcInstt(CntcInstt cntcInstt) throws Exception {
        insert("CntcInsttDAO.insertCntcInstt", cntcInstt);
	}

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?깅줉?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void insertCntcSystem(CntcSystem cntcSystem) throws Exception {
        insert("CntcInsttDAO.insertCntcSystem", cntcSystem);
	}

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ?깅줉?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void insertCntcService(CntcService cntcService) throws Exception {
        insert("CntcInsttDAO.insertCntcService", cntcService);
	}

	/**
	 * ?곌퀎湲곌? ?곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcInstt
	 * @return CntcInstt(?곌퀎湲곌?)
	 */
	public CntcInstt selectCntcInsttDetail(CntcInstt cntcInstt) throws Exception {
		return (CntcInstt) selectOne("CntcInsttDAO.selectCntcInsttDetail", cntcInstt);
	}

	/**
	 * ?곌퀎?쒖뒪???곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcInstt
	 * @return CntcInstt(?곌퀎湲곌?)
	 */
	public CntcSystem selectCntcSystemDetail(CntcSystem cntcSystem) throws Exception {
		return (CntcSystem) selectOne("CntcInsttDAO.selectCntcSystemDetail", cntcSystem);
	}

	/**
	 * ?곌퀎?쒕퉬???곸꽭??ぉ??議고쉶?쒕떎.
	 * @param cntcInstt
	 * @return CntcInstt(?곌퀎湲곌?)
	 */
	public CntcService selectCntcServiceDetail(CntcService cntcService) throws Exception {
		return (CntcService) selectOne("CntcInsttDAO.selectCntcServiceDetail", cntcService);
	}

    /**
	 * ?곌퀎湲곌? 紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?곌퀎湲곌? 紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectCntcInsttList(CntcInsttVO searchVO) throws Exception {
        return selectList("CntcInsttDAO.selectCntcInsttList", searchVO);
    }

    /**
	 * ?곌퀎湲곌? 珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎湲곌? 珥?媛쒖닔)
     */
    public int selectCntcInsttListTotCnt(CntcInsttVO searchVO) throws Exception {
        return (Integer)selectOne("CntcInsttDAO.selectCntcInsttListTotCnt", searchVO);
    }

    /**
	 * ?곌퀎?쒖뒪??紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?곌퀎?쒖뒪??紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectCntcSystemList(CntcSystemVO searchVO) throws Exception {
        return selectList("CntcInsttDAO.selectCntcSystemList", searchVO);
    }

    /**
	 * ?곌퀎?쒖뒪??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎?쒖뒪??珥?媛쒖닔)
     */
    public int selectCntcSystemListTotCnt(CntcSystemVO searchVO) throws Exception {
        return (Integer)selectOne("CntcInsttDAO.selectCntcSystemListTotCnt", searchVO);
    }

    /**
	 * ?곌퀎?쒕퉬??紐⑸줉??議고쉶?쒕떎.
     * @param searchVO
     * @return List(?곌퀎?쒕퉬??紐⑸줉)
     * @throws Exception
     */
    public List<EgovMap> selectCntcServiceList(CntcServiceVO searchVO) throws Exception {
        return selectList("CntcInsttDAO.selectCntcServiceList", searchVO);
    }

    /**
	 * ?곌퀎?쒕퉬??珥?媛쒖닔瑜?議고쉶?쒕떎.
     * @param searchVO
     * @return int(?곌퀎?쒕퉬??珥?媛쒖닔)
     */
    public int selectCntcServiceListTotCnt(CntcServiceVO searchVO) throws Exception {
        return (Integer)selectOne("CntcInsttDAO.selectCntcServiceListTotCnt", searchVO);
    }

    /**
	 * ?곌퀎湲곌????섏젙?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void updateCntcInstt(CntcInstt cntcInstt) throws Exception {
		update("CntcInsttDAO.updateCntcInstt", cntcInstt);
	}

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?섏젙?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void updateCntcSystem(CntcSystem cntcSystem) throws Exception {
        update("CntcInsttDAO.updateCntcSystem", cntcSystem);
	}

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?섏젙?쒕떎.
	 * @param cntcInstt
	 * @throws Exception
	 */
	public void updateCntcService(CntcService cntcService) throws Exception {
        update("CntcInsttDAO.updateCntcService", cntcService);
	}

}
