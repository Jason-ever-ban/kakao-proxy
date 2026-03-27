export default async function handler(req, res) {
  // 🛑 주의: 아래 주소를 재영님의 '구글 앱스 스크립트 배포 URL(/exec)'로 반드시 바꿔주세요!
  const GAS_URL = "https://script.google.com/macros/s/AKfycbxrekMu69GUi0lU8djKxRqgVSOhwEnrgS0O7g3NmMPlvGY33ClXeQpd52wItCqWGssL/exec";

  
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      redirect: "follow" // 302 리다이렉트 자동 추적 (핵심!)
    });

    const data = await response.json();
    
    // 카카오톡으로 JSON 전달 (200 OK)
    res.status(200).json(data);
  } catch (error) {
    res.status(200).json({
      version: "2.0",
      template: { outputs: [{ simpleText: { text: "서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요." } }] }
    });
  }
}
