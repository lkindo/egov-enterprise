package egovframework.com.ssi.syi.sim.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.ssi.syi.sim.service.EgovSystemCntcService;
import egovframework.com.ssi.syi.sim.service.SystemCntc;
import egovframework.com.ssi.syi.sim.service.SystemCntcVO;
import jakarta.annotation.Resource;



/**
 *
 * ?쒖뒪?쒖뿰怨꾩뿉 ????쒕퉬??援ы쁽?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("SystemCntcService")
public class EgovSystemCntcServiceImpl extends EgovAbstractServiceImpl implements  EgovSystemCntcService {

    @Resource(name="SystemCntcDAO")
    private SystemCntcDAO systemCntcDAO;

    /**
	 * ?쒖뒪?쒖뿰怨꾨? ??젣?쒕떎.
	 */
	 @Override
	public void deleteSystemCntc(SystemCntc systemCntc) throws Exception {
    	systemCntcDAO.deleteSystemCntc(systemCntc);
	 }

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?깅줉?쒕떎.
	 */
    @Override
	public void insertSystemCntc(SystemCntc systemCntc) throws Exception {
    	systemCntcDAO.insertSystemCntc(systemCntc);
	}

	/**
	 * ?쒖뒪?쒖뿰怨??곸꽭??ぉ??議고쉶?쒕떎.
	 */
	@Override
	public SystemCntc selectSystemCntcDetail(SystemCntc systemCntc) throws Exception {
    	SystemCntc ret = systemCntcDAO.selectSystemCntcDetail(systemCntc);
    	return ret;
	}

	/**
	 * ?쒖뒪?쒖뿰怨??뱀씤/?뱀씤痍⑥냼?쒕떎.
	 */
	@Override
	public void confirmSystemCntc(SystemCntc systemCntc) throws Exception {
        systemCntcDAO.confirmSystemCntc(systemCntc);
	}

	/**
	 * ?쒖뒪?쒖뿰怨?紐⑸줉??議고쉶?쒕떎.
	 */
	@Override
	public List<EgovMap> selectSystemCntcList(SystemCntcVO searchVO) throws Exception {
        return systemCntcDAO.selectSystemCntcList(searchVO);
	}

	/**
	 * ?쒖뒪?쒖뿰怨?珥?媛쒖닔瑜?議고쉶?쒕떎.
	 */
	@Override
	public int selectSystemCntcListTotCnt(SystemCntcVO searchVO) throws Exception {
        return systemCntcDAO.selectSystemCntcListTotCnt(searchVO);
	}

	/**
	 * ?쒖뒪?쒖뿰怨꾨? ?섏젙?쒕떎.
	 */
	@Override
	public void updateSystemCntc(SystemCntc systemCntc) throws Exception {
        systemCntcDAO.updateSystemCntc(systemCntc);
	}
}
