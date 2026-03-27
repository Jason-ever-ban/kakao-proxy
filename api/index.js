module.exports = async (req, res) => {
  // 🛑 주의: 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbytrIHGjAzMgz-yWr7tFDHD1SypWZchDtavG-OIpvyA1CJLOvvyNBWbwV_kG8rZimdb/exec";

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
    let requestBody;
    try {
      requestBody = req.body ?? {};
    } catch (bodyError) {
      return res.status(200).json(kakaoSimpleText("[디버그] req.body 파싱 오류: " + bodyError.message));
    }

    // 2.5초 타임아웃 설정 (카카오 5초 제한 방어)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

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
      const isTimeout = fetchError.name === "AbortError";
      const msg = isTimeout
        ? "⏱️ 서버가 바쁩니다. 예약은 시트에 안전하게 기록 중입니다!"
        : "🌐 GAS 통신 오류: " + fetchError.message;
      return res.status(200).json(kakaoSimpleText(msg));
    } finally {
      clearTimeout(timeoutId);
    }

    let rawText;
    try {
      rawText = await gasResponse.text();
    } catch (textError) {
      return res.status(200).json(kakaoSimpleText("[디버그] 응답 읽기 실패: " + textError.message));
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(200).json(kakaoSimpleText("[디버그] 구글이 이상한 문서를 반환함:\n" + rawText.substring(0, 200)));
    }

    // 🚨 핵심: 카카오 규격이 아니면 에러 말풍선을 띄움!
    if (!isValidKakaoResponse(parsed)) {
      return res.status(200).json(kakaoSimpleText("[디버그] 카카오 규격 아님:\n" + JSON.stringify(parsed).substring(0, 200)));
    }

    return res.status(200).json(parsed);

  } catch (error) {
    const msg = "[최후방어] Vercel 예외: " + (error?.message || "unknown");
    try {
      return res.status(200).json(kakaoSimpleText(msg));
    } catch (finalError) {
      res.statusCode = 200;
      res.end(JSON.stringify(kakaoSimpleText("시스템 오류가 발생했습니다.")));
    }
  }
};
