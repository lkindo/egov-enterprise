package egovframework.com.sym.sym.srv.service.impl;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.sym.srv.service.EgovServerService;
import egovframework.com.sym.sym.srv.service.Server;
import egovframework.com.sym.sym.srv.service.ServerEqpmn;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelate;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelateVO;
import egovframework.com.sym.sym.srv.service.ServerEqpmnVO;
import egovframework.com.sym.sym.srv.service.ServerVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * 媛쒖슂
 * - ?쒕쾭?뺣낫?????ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?쒕쾭?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?쒕쾭?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:33
 */
@Service("egovServerService")
public class EgovServerServiceImpl extends EgovAbstractServiceImpl implements EgovServerService {

	@Resource(name="serverDAO")
	private ServerDAO serverDAO;

	/**
	 * ?쒕쾭?λ퉬瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 */
	@Override
	public List<ServerEqpmnVO> selectServerEqpmnList(ServerEqpmnVO serverEqpmnVO) throws Exception {
		return serverDAO.selectServerEqpmnList(serverEqpmnVO);
	}

	/**
	 * ?쒕쾭?λ퉬紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return int - ?쒕쾭?λ퉬 移댁슫????
	 */
	@Override
	public int selectServerEqpmnListTotCnt(ServerEqpmnVO serverEqpmnVO) throws Exception {
		return serverDAO.selectServerEqpmnListTotCnt(serverEqpmnVO);
	}

	/**
	 * ?깅줉???쒕쾭?λ퉬???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 */
	@Override
	public ServerEqpmnVO selectServerEqpmn(ServerEqpmnVO serverEqpmnVO) throws Exception {
		return serverDAO.selectServerEqpmn(serverEqpmnVO);
	}

	/**
	 * ?쒕쾭?λ퉬?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	@Override
	public ServerEqpmnVO insertServerEqpmn(ServerEqpmn serverEqpmn, ServerEqpmnVO serverEqpmnVO) throws Exception {
		serverEqpmn.setRegstYmd(EgovStringUtil.removeMinusChar(serverEqpmn.getRegstYmd()));
		serverDAO.insertServerEqpmn(serverEqpmn);
		serverEqpmnVO.setServerEqpmnId(serverEqpmn.getServerEqpmnId());
		return serverDAO.selectServerEqpmn(serverEqpmnVO);
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜??섏젙?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	@Override
	public void updateServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		serverEqpmn.setRegstYmd(EgovStringUtil.removeMinusChar(serverEqpmn.getRegstYmd()));
		serverDAO.updateServerEqpmn(serverEqpmn);
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜???젣?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	@Override
	public void deleteServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		serverDAO.deleteServerEqpmn(serverEqpmn);
	}

	/**
	 * ?쒕쾭?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return List - ?쒕쾭 紐⑸줉
	 */
	@Override
	public List<ServerVO> selectServerList(ServerVO serverVO) throws Exception {
		return serverDAO.selectServerList(serverVO);
	}

	/**
	 * ?쒕쾭紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return int - ?쒕쾭 移댁슫????
	 */
	@Override
	public int selectServerListTotCnt(ServerVO serverVO) throws Exception {
		return serverDAO.selectServerListTotCnt(serverVO);
	}

	/**
	 * ?깅줉???쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return serverVO - ?쒕쾭 Vo
	 */
	@Override
	public ServerVO selectServer(ServerVO serverVO) throws Exception {
		return serverDAO.selectServer(serverVO);
	}

	/**
	 * ?깅줉???쒕쾭???곸꽭?뺣낫以??쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 */
	@Override
	public List<ServerEqpmnVO> selectServerEqpmnRelateDetail(ServerVO serverVO) throws Exception {
		return serverDAO.selectServerEqpmnRelateDetail(serverVO);
	}

	/**
	 * ?쒕쾭???깅줉???쒕쾭?λ퉬紐⑸줉??移댁슫?몃? 議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return int - ?쒕쾭???깅줉???쒕쾭?λ퉬 移댁슫????
	 */
	@Override
	public int selectServerEqpmnRelateDetailTotCnt(ServerVO serverVO) throws Exception{
		return serverDAO.selectServerEqpmnRelateDetailTotCnt(serverVO);
	}

	/**
	 * ?쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	@Override
	public ServerVO insertServer(Server server, ServerVO serverVO) throws Exception {
		server.setRegstYmd(EgovStringUtil.removeMinusChar(server.getRegstYmd()));
		serverDAO.insertServer(server);
		serverVO.setServerId(server.getServerId());
		return serverDAO.selectServer(serverVO);
	}

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	@Override
	public void updateServer(Server server) throws Exception {
		server.setRegstYmd(EgovStringUtil.removeMinusChar(server.getRegstYmd()));
		serverDAO.updateServer(server);
	}

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜???젣?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	@Override
	public void deleteServer(Server server) throws Exception {
		serverDAO.deleteServer(server);
	}

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? 愿由ы븯湲??꾪빐 ????쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return List - ?쒕쾭 紐⑸줉
	 */
	@Override
	public List<ServerEqpmnRelateVO> selectServerEqpmnRelateList(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception {
		return serverDAO.selectServerEqpmnRelateList(serverEqpmnRelateVO);
	}

	/**
	 * ?쒕쾭?λ퉬愿怨????紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return int - ?쒕쾭?λ퉬愿怨?移댁슫????
	 */
	@Override
	public int selectServerEqpmnRelateListTotCnt(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception {
		return serverDAO.selectServerEqpmnRelateListTotCnt(serverEqpmnRelateVO);
	}

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 */
	@Override
	public void insertServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception {
		serverDAO.insertServerEqpmnRelate(serverEqpmnRelate);
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬愿怨꾩젙蹂대? ??젣?쒕떎.
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 */
	@Override
	public void deleteServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception {
		serverDAO.deleteServerEqpmnRelate(serverEqpmnRelate);
	}

}
