module.exports = async (req, res) => {
  // 🛑 주의: 아래 주소를 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxrekMu69GUi0lU8djKxRqgVSOhwEnrgS0O7g3NmMPlvGY33ClXeQpd52wItCqWGssL/exec";

  try {
    // 1. 카카오톡의 요청을 구글로 그대로 전달
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
      redirect: "follow" // 302 리다이렉트 완벽 추적
    });

    // 2. 구글이 만든 답변을 텍스트 그대로 뽑아냄
    const rawText = await response.text();

    // 3. Vercel이 포장하지 못하도록 강제로 텍스트 그대로 발송 (핵심!)
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(rawText);

  } catch (error) {
    // 만약 에러가 나도 카카오가 읽을 수 있는 규격으로 전송
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "통신 지연: " + error.message } }] }
    }));
  }
};
