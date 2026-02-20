package egovframework.com.utl.pao.web;

import java.io.IOException;
import java.sql.SQLException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.utl.pao.service.EgovPrntngOutpt;
import egovframework.com.utl.pao.service.PrntngOutptVO;
import jakarta.annotation.Resource;
import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.context.annotation.Lazy;

/**
 *
 * ??? ???Util ????? ? ? Controller
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 *      <pre>
 * << ?????Modification Information) >>
 *
 *  ????              ????           ????
 *  ----------   --------   ---------------------------
 *  2009.04.01   ????           ????
 *  2017-02-14   ????            ??????ES) - ???????????? ??CWE-253, CWE-440, CWE-754]
 *  2019.12.06   ???           KISA ?? ??(???????? , EgovPropertyService ????
 *
 *      </pre>
 **/
@Controller
public class EgovErncslController extends HttpServlet {

	private static final long serialVersionUID = 8921470672390456794L;

	@Lazy
	@Resource(name = "PrntngOutpt")
	private EgovPrntngOutpt prntngOutpt;

	private static final Logger LOGGER = LoggerFactory.getLogger(EgovErncslController.class);

	/**
	 * ???????
	 **/
	@Override
	public void init(ServletConfig config) throws ServletException {
		super.init(config);
	}

	/**
	 * ???????? ???
	 * 
	 * @param
	 * @param
	 * @return
	 * @exception MyException
	 * @see
	 **/
	@RequestMapping(value = "/utl/pao/EgovErncsl.do")
	public void doGet(@RequestParam("sOrgCode") String orgCode, @RequestParam("sErncslSe") String erncslSe,
			HttpServletRequest request, HttpServletResponse response)
			throws ServletException, IOException {

		LOGGER.info("EgovErncsl start....");

		PrntngOutptVO req = new PrntngOutptVO();

		req.setOrgCode(orgCode);
		req.setErncslSe(erncslSe);

		PrntngOutptVO res = null;
		try {
			res = prntngOutpt.selectErncsl(req);
		} catch (SQLException e) {
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			throw new RuntimeException("Service call error", e);
		} catch (Exception e) {
			// LOGGER.error(e.getMessage());
			// 2017-02-14 ???? ??????ES) - ???????????? ??CWE-253, CWE-440, CWE-754]
			LOGGER.error("[" + e.getClass() + "] : ", e.getMessage());
			throw new RuntimeException("Service call error", e);
		}

		if (res == null) {
			throw new RuntimeException("image not found!!!");
		}

		byte[] img = res.getImgInfo();
		String imgtype = res.getImgType();
		String type = "";

		if (imgtype != null && !"".equals(imgtype)) {
			type = "image/" + imgtype;
		} else {
			LOGGER.debug("Image fileType is null.");
		}
		if (img == null) {
			LOGGER.debug("Image fileInfo is null.");
			return;
		}

		response.setHeader("Content-Type", type.replaceAll("\r", "").replaceAll("\n", ""));
		response.setHeader("Content-Length", "" + img.length);
		response.getOutputStream().write(img);
		response.getOutputStream().flush();
		response.getOutputStream().close();

		LOGGER.info("EgovErncsl end....");
	}
}
