package egovframework.com.ssi.syi.iis.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.ssi.syi.iis.service.CntcInstt;
import egovframework.com.ssi.syi.iis.service.CntcInsttVO;
import egovframework.com.ssi.syi.iis.service.CntcService;
import egovframework.com.ssi.syi.iis.service.CntcServiceVO;
import egovframework.com.ssi.syi.iis.service.CntcSystem;
import egovframework.com.ssi.syi.iis.service.CntcSystemVO;
import egovframework.com.ssi.syi.iis.service.EgovCntcInsttService;
import jakarta.annotation.Resource;


/**
 *
 * ?곌퀎湲곌???????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("CntcInsttService")
public class EgovCntcInsttServiceImpl extends EgovAbstractServiceImpl implements  EgovCntcInsttService {


    @Resource(name="CntcInsttDAO")
    private CntcInsttDAO cntcInsttDAO;

    /**
	 * ?곌퀎湲곌?????젣?쒕떎.
	 */
	 @Override
	public void deleteCntcInstt(CntcInstt cntcInstt) throws Exception {
    	cntcInsttDAO.deleteCntcInstt(cntcInstt);
	 }

    /**
	 * ?곌퀎?쒖뒪?쒖쓣 ??젣?쒕떎.
	 */
	 @Override
	public void deleteCntcSystem(CntcSystem cntcSystem) throws Exception {
    	cntcInsttDAO.deleteCntcSystem(cntcSystem);
	 }

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ??젣?쒕떎.
	 */
	 @Override
	public void deleteCntcService(CntcService cntcService) throws Exception {
    	cntcInsttDAO.deleteCntcService(cntcService);
	 }


	 /**
	 * ?곌퀎湲곌????깅줉?쒕떎.
	 */
    @Override
	public void insertCntcInstt(CntcInstt cntcInstt) throws Exception {
    	cntcInsttDAO.insertCntcInstt(cntcInstt);
	}

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?깅줉?쒕떎.
	 */
    @Override
	public void insertCntcSystem(CntcSystem cntcSystem) throws Exception {
    	cntcInsttDAO.insertCntcSystem(cntcSystem);
	}

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ?깅줉?쒕떎.
	 */
    @Override
	public void insertCntcService(CntcService cntcService) throws Exception {
    	cntcInsttDAO.insertCntcService(cntcService);
	}

    /**
	 * ?곌퀎湲곌? ?곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CntcInstt selectCntcInsttDetail(CntcInstt cntcInstt) throws Exception {
    	CntcInstt ret = cntcInsttDAO.selectCntcInsttDetail(cntcInstt);
    	return ret;
	}

    /**
	 * ?곌퀎?쒖뒪???곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CntcSystem selectCntcSystemDetail(CntcSystem cntcSystem) throws Exception {
		CntcSystem ret = cntcInsttDAO.selectCntcSystemDetail(cntcSystem);
    	return ret;
	}

    /**
	 * ?곌퀎?쒕퉬???곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public CntcService selectCntcServiceDetail(CntcService cntcService) throws Exception {
		CntcService ret = cntcInsttDAO.selectCntcServiceDetail(cntcService);
    	return ret;
	}

	/**
	 * ?곌퀎湲곌? 紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectCntcInsttList(CntcInsttVO searchVO) throws Exception {
        return cntcInsttDAO.selectCntcInsttList(searchVO);
	}

	/**
	 * ?곌퀎湲곌? 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCntcInsttListTotCnt(CntcInsttVO searchVO) throws Exception {
        return cntcInsttDAO.selectCntcInsttListTotCnt(searchVO);
	}

	/**
	 * ?곌퀎?쒖뒪??紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectCntcSystemList(CntcSystemVO searchVO) throws Exception {
        return cntcInsttDAO.selectCntcSystemList(searchVO);
	}

	/**
	 * ?곌퀎?쒖뒪??珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCntcSystemListTotCnt(CntcSystemVO searchVO) throws Exception {
        return cntcInsttDAO.selectCntcSystemListTotCnt(searchVO);
	}

	/**
	 * ?곌퀎?쒕퉬??紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectCntcServiceList(CntcServiceVO searchVO) throws Exception {
        return cntcInsttDAO.selectCntcServiceList(searchVO);
	}

	/**
	 * ?곌퀎?쒕퉬??珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectCntcServiceListTotCnt(CntcServiceVO searchVO) throws Exception {
        return cntcInsttDAO.selectCntcServiceListTotCnt(searchVO);
	}

	/**
	 * ?곌퀎湲곌????섏젙?쒕떎.
	 */
	@Override
	public void updateCntcInstt(CntcInstt cntcInstt) throws Exception {
        cntcInsttDAO.updateCntcInstt(cntcInstt);
	}

	/**
	 * ?곌퀎?쒖뒪?쒖쓣 ?섏젙?쒕떎.
	 */
	@Override
	public void updateCntcSystem(CntcSystem cntcSystem) throws Exception {
        cntcInsttDAO.updateCntcSystem(cntcSystem);
	}

	/**
	 * ?곌퀎?쒕퉬?ㅻ? ?섏젙?쒕떎.
	 */
	@Override
	public void updateCntcService(CntcService cntcService) throws Exception {
        cntcInsttDAO.updateCntcService(cntcService);
	}

}
