const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 정적 파일 제공
app.use(express.static('public'));

// Claude API 엔드포인트
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { baseQuestion, previousQuestions = [], stepNumber } = req.body;
    
    console.log('API 요청 받음:', { baseQuestion, previousQuestions, stepNumber });

    if (!process.env.CLAUDE_API_KEY) {
      console.error('Claude API key가 없습니다');
      return res.status(500).json({ error: 'API key not found' });
    }

    // 중복 제거된 이전 질문들
    const uniquePrevious = [...new Set(previousQuestions)];
    
    const prompt = `사용자가 "${baseQuestion}"에 대해 탐구하고 있습니다.

${uniquePrevious.length > 0 ? `이미 탐구한 질문들: ${uniquePrevious.join(', ')}` : ''}

"${baseQuestion}"와 관련하여 새롭고 구체적인 탐구 질문 5개를 제안해주세요.

조건:
- 이전 질문들과 중복되지 않아야 함
- "${baseQuestion}"와 직접 관련이 있어야 함  
- 구체적이고 탐구 가능한 질문이어야 함
- 각 질문은 서로 다른 관점에서 접근해야 함

JSON 형식으로만 응답:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}`;

    console.log('Claude API 호출:', { baseQuestion, previousCount: previousQuestions.length });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",  
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", 
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      console.error(`Claude API 오류: ${response.status}`);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.content[0].text.trim();
    
    // JSON 추출
    if (content.includes('{')) {
      content = content.substring(content.indexOf('{'));
      content = content.substring(0, content.lastIndexOf('}') + 1);
    }
    
    const questions = JSON.parse(content);
    console.log('Claude 응답:', questions);
    
    res.json(questions);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'API 호출 실패',
      details: error.message 
    });
  }
});

// 루트 경로
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
