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
    
const prompt = `초등학생~중학생이 탐구하고 있습니다.

${req.body.userAnswer ? `
직전 질문: "${req.body.contextQuestion}"
학생의 답변/생각: "${req.body.userAnswer}"

이 답변을 바탕으로 더 깊이 파고들 수 있는 질문 5개를 만들어주세요.
` : `
"${req.body.contextQuestion}"에 대한 첫 탐구 질문 5개를 만들어주세요.
`}

${uniquePrevious.length > 0 ? `이미 나온 질문들 (중복 금지): ${uniquePrevious.join(', ')}` : ''}

조건:
- 한 문장으로 짧고 간단하게
- 의인화 표현 금지 (객관적이고 과학적으로)
- 이전 질문과 완전히 다르게
- 탐구가 깊어지도록
- 실제로 답을 찾을 수 있는 질문

JSON 형식으로만 응답:
{"questions": ["질문1", "질문2", "질문3", "질문4", "질문5"]}`;

    console.log('Claude API 호출:', { baseQuestion, previousCount: previousQuestions.length });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",  
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.CLAUDE_API_KEY,
    "anthropic-version": "2023-06-01"
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
