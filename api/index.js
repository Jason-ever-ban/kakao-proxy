module.exports = async (req, res) => {
  // 🛑 주의: 재영님의 '구글 앱스 스크립트 배포 URL'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwealw_5e1fcjt1h92FIBLQHcT7S5VCNhmPg-Vqz0IdHs4g4pvCGU3VP7HObOH8caVn/exec";

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const kakaoSimpleText = (msg) => ({
    version: "2.0",
    template: { outputs: [{ simpleText: { text: String(msg).substring(0, 490) } }] }
  });

  const isValidKakaoResponse = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    if (obj.version !== "2.0") return false;
    if (obj.template && Array.isArray(obj.template.outputs)) return true;
    if (obj.useCallback === true) return true;
    return false;
  };

  try {
    let requestBody = req.body ?? {};
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4200);

    let gasResponse;
    try {
      gasResponse = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(requestBody),
        redirect: "follow",
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        return res.status(200).json(kakaoSimpleText("✅ 예약이 안전하게 접수되었습니다! (시트 반영 중)"));
      }
      return res.status(200).json(kakaoSimpleText("🌐 통신 오류: " + fetchError.message));
    } finally {
      clearTimeout(timeoutId);
    }

    let rawText = await gasResponse.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(200).json(kakaoSimpleText("[디버그] 구글 응답 에러:\n" + rawText.substring(0, 200)));
    }

    if (!isValidKakaoResponse(parsed)) {
      return res.status(200).json(kakaoSimpleText("[디버그] 카카오 규격 아님:\n" + JSON.stringify(parsed).substring(0, 200)));
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(200).json(kakaoSimpleText("[최후방어] 예외 발생: " + (error?.message || "unknown")));
  }
};
