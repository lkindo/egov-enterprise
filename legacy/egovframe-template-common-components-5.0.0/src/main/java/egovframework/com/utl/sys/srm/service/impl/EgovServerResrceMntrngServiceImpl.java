package egovframework.com.utl.sys.srm.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.utl.sys.srm.service.EgovServerResrceMntrngService;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrng;
import egovframework.com.utl.sys.srm.service.ServerResrceMntrngVO;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?먯썝紐⑤땲?곕쭅??????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 06-9-2010 ?ㅼ쟾 11:23:59
 */
@Service("egovServerResrceMntrngService")
public class EgovServerResrceMntrngServiceImpl extends EgovAbstractServiceImpl implements EgovServerResrceMntrngService {

	@Resource(name="serverResrceMntrngDAO")
	private ServerResrceMntrngDAO serverResrceMntrngDAO;

	   /** ID Generation */
    @Resource(name="egovServerResrceMntrngLogIdGnrService")
    private EgovIdGnrService egovServerResrceMntrngLogIdGnrService;

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return List - ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇 紐⑸줉
	 */
	@Override
	public List<ServerResrceMntrngVO> selectServerResrceMntrngList(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return serverResrceMntrngDAO.selectServerResrceMntrngList(serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇?뺣낫 紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return int - ?쒕쾭?먯썝紐⑤땲?곕쭅??濡쒓렇 移댁슫????
	 */
	@Override
	public int selectServerResrceMntrngListTotCnt(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return serverResrceMntrngDAO.selectServerResrceMntrngListTotCnt(serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 濡쒓렇???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return ServerResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 */
	@Override
	public ServerResrceMntrngVO selectServerResrceMntrng(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return serverResrceMntrngDAO.selectServerResrceMntrng(serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑤땲?곕쭅 濡쒓렇?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param serverResrceMntrng - ?쒕쾭?먯썝紐⑤땲?곕쭅 model
	 */
	@Override
	public void insertServerResrceMntrng(ServerResrceMntrng serverResrceMntrng) throws Exception {
		serverResrceMntrng.setLogId(egovServerResrceMntrngLogIdGnrService.getNextStringId());
		serverResrceMntrngDAO.insertServerResrceMntrng(serverResrceMntrng);
	}

	/**
	 * ?쒕쾭?먯썝紐⑦떚?덈쭅 ??곸꽌踰꾩쓽 紐⑸줉??議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return ServerResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 */
	@Override
	public List<ServerResrceMntrngVO> selectMntrngServerList(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return serverResrceMntrngDAO.selectMntrngServerList(serverResrceMntrngVO);
	}

	/**
	 * ?쒕쾭?먯썝紐⑦떚?덈쭅 ??곸꽌踰?紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverResrceMntrngVO - ?쒕쾭?먯썝紐⑤땲?곕쭅 Vo
	 * @return int - ?쒕쾭?먯썝紐⑤땲?곕쭅 ??곸꽌踰꾩쓽 移댁슫????
	 */
	@Override
	public int selectMntrngServerListTotCnt(ServerResrceMntrngVO serverResrceMntrngVO) throws Exception {
		return serverResrceMntrngDAO.selectMntrngServerListTotCnt(serverResrceMntrngVO);
	}
}
