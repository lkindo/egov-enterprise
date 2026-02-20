package egovframework.com.ext.captcha;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.Random;

import javax.imageio.ImageIO;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.annotation.IncludedInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/**
 * Captcha 泥섎━瑜??꾪븳 而⑦듃濡ㅻ윭
 * 
 * @author 沅뚰깭??
 * @since 2024.10.29
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2024.10.29  沅뚰깭??         理쒖큹 ?앹꽦
 *   2025.06.19  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-UselessParentheses(?몃え?녿뒗 愿꾪샇)
 *
 *      </pre>
 */
@Controller
public class EgovCaptchaController {

	protected final Log logger = LogFactory.getLog(getClass());

	/**
	 * Captcha ?ъ슜???낅젰 ?섏씠吏
	 * 
	 * @param session
	 * @param model
	 * @return
	 */
	@IncludedInfo(name = "Captcha", order = 3300, gid = 100)
	@RequestMapping("/ext/captcha/input.do")
	public String input(HttpSession session, ModelMap model) {
		return "egovframework/com/ext/captcha/EgovCaptcha";
	}

	/**
	 * Captcha ?낅젰媛?寃利?寃곌낵 ?섏씠吏
	 * 
	 * @param session
	 * @param model
	 * @param captcha
	 * @param pgNm
	 * @return
	 */
	@PostMapping("/ext/captcha/result.do")
	public String result(HttpSession session, ModelMap model, @RequestParam("captcha") String captcha,
			@RequestParam("pgNm") String pgNm) {
		String expectedCaptcha = (String) session.getAttribute("captcha" + pgNm);
		boolean result = expectedCaptcha != null && expectedCaptcha.equalsIgnoreCase(captcha);
		if (result) {
			model.addAttribute("message", "Captcha 媛믪씠 ?щ컮瑜닿쾶 ?낅젰?섏뿀?듬땲??");
		} else {
			model.addAttribute("message", "Captcha 媛믪씠 ?щ컮瑜댁? ?딆뒿?덈떎.");
		}
		model.addAttribute("result", result);
		return "egovframework/com/ext/captcha/EgovCaptchaResult";
	}

	/**
	 * Captcha ?대?吏 ?앹꽦
	 * 
	 * @param request
	 * @param response
	 * @param width    ?대?吏 媛濡??ш린
	 * @param height   ?대?吏 ?몃줈 ?ш린
	 * @param length   Captcha 臾몄옄 湲몄씠
	 * @param pgNm     Captcha瑜??ъ슜?섎뒗 ?꾨줈洹몃옩 援щ텇媛?
	 */
	@GetMapping("/ext/captcha/generate.do")
	public void generate(HttpServletRequest request, HttpServletResponse response,
			@RequestParam(value = "width", defaultValue = "150") int width,
			@RequestParam(value = "height", defaultValue = "50") int height,
			@RequestParam(value = "lenght", defaultValue = "5") int length,
			@RequestParam(value = "pgNm", defaultValue = "capt") String pgNm) {
		try {
			String captchaTxt = generateRandomText(length);
			request.getSession().setAttribute("captcha" + pgNm, captchaTxt);

			BufferedImage bufferedImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
			Graphics2D g2d = bufferedImage.createGraphics();

			g2d.setColor(Color.white);
			g2d.fillRect(0, 0, width, height);

			g2d.setFont(new Font("Arial", Font.BOLD, 40));
			g2d.setColor(Color.BLACK);

			g2d.drawString(captchaTxt, 10, 35);
			g2d.dispose();
			response.setContentType("image/png");
			ImageIO.write(bufferedImage, "png", response.getOutputStream());
		} catch (IOException e) {
			response.setStatus(500);
			logger.error("Captcha generate error", e);
		}
	}

	/**
	 * ?꾩쓽??臾몄옄?댁쓣 ?몄옄濡?諛쏆? 湲몄씠 留뚰겮 ?앹꽦
	 * 
	 * @param length ?앹꽦?섎젮??臾몄옄??湲몄씠
	 * @return length ?몄옄??湲몄씠留뚰겮 ?앹꽦???꾩쓽??臾몄옄??
	 */
	private String generateRandomText(int length) {
		String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		StringBuilder sb = new StringBuilder();
		Random random = new Random();
		for (int i = 0; i < length; i++) {
			sb.append(chars.charAt(random.nextInt(chars.length())));
		}
		return sb.toString();
	}

}
